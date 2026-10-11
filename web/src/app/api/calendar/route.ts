import { createAdminClient } from "@/lib/supabase/admin";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Flux iCalendar des événements publics : abonnable depuis Google Agenda, Outlook, Apple Calendar. */
export async function GET() {
  const { data } = await createAdminClient()
    .from("events")
    .select("id, slug, title, description, location, starts_at, ends_at, status")
    .eq("is_public", true)
    .in("status", ["published", "cancelled"])
    .gte("starts_at", new Date(Date.now() - 30 * 864e5).toISOString())
    .order("starts_at");

  const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);

  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${esc(site.name)}//Agenda//FR`,
    `X-WR-CALNAME:${esc(site.name)}`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    ...(data ?? []).flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.id}@${new URL(site.url).host}`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(new Date(e.starts_at).toISOString())}`,
      `DTEND:${stamp(new Date(e.ends_at).toISOString())}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.description ?? "")}`,
      ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
      `URL:${site.url}/evenements/${e.slug}`,
      `STATUS:${e.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="agenda.ics"' },
  });
}
