import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notifications HelloAsso (Mon compte > Intégrations et API > URL de notification).
 * URL à déclarer : https://<domaine>/api/helloasso/webhook?token=<HELLOASSO_WEBHOOK_TOKEN>
 *
 * HelloAsso ne signe pas ses notifications : on les authentifie par un jeton secret dans l'URL.
 * On n'enregistre que les paiements autorisés issus d'un formulaire de don.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.HELLOASSO_WEBHOOK_TOKEN ?? "";
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!expected || token.length !== expected.length || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: HelloAssoNotification;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (body.eventType !== "Payment") return NextResponse.json({ ignored: body.eventType });

  const p = body.data;
  if (p?.state !== "Authorized" || p.order?.formType !== "Donation") {
    return NextResponse.json({ ignored: "not an authorized donation" });
  }

  const { error } = await createAdminClient().from("donations").upsert(
    {
      helloasso_payment_id: p.id,
      helloasso_order_id: p.order?.id ?? null,
      amount_cents: p.amount,
      is_recurring: p.paymentType === "Monthly" || Boolean(p.installmentNumber && p.installmentNumber > 0),
      donor_first_name: p.payer?.firstName ?? null,
      donor_last_name: p.payer?.lastName ?? null,
      donor_email: p.payer?.email?.toLowerCase() ?? null,
      is_company: Boolean(p.payer?.company),
      paid_at: p.date,
      raw: body,
    },
    { onConflict: "helloasso_payment_id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[helloasso] insert failed", error.message);
    return NextResponse.json({ error: "db" }, { status: 500 }); // HelloAsso réessaiera
  }
  return NextResponse.json({ ok: true });
}

interface HelloAssoNotification {
  eventType: "Payment" | "Order" | "Form" | string;
  data?: {
    id: number;
    amount: number; // en centimes
    date: string;
    state: string;
    paymentType?: string;
    installmentNumber?: number;
    order?: { id: number; formType: string; formSlug?: string };
    payer?: { firstName?: string; lastName?: string; email?: string; company?: string };
  };
}
