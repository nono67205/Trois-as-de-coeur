import { NextResponse } from "next/server";

// Utilisé par Render (healthCheckPath) pour savoir si le service répond.
export function GET() {
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}
