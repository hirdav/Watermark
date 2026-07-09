import { NextResponse } from "next/server";

// Temporary diagnostic route — confirms env var presence without ever
// exposing secret values. Remove after use.
export async function GET() {
  return NextResponse.json({
    hasResendKey: !!process.env.RESEND_API_KEY,
    resendKeyLength: (process.env.RESEND_API_KEY || "").length,
    mailFrom: process.env.MAIL_FROM || null,
  });
}
