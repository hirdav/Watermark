import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends transactional email via Resend's HTTPS API when configured. Falls
 * back to logging the message server-side when no API key is set — this
 * keeps local dev and this environment (no email provider account yet)
 * fully functional without ever exposing the message content to the client.
 *
 * Uses an HTTPS API rather than SMTP because Railway (and most PaaS hosts)
 * block outbound SMTP ports (25/465/587) on lower tiers to fight spam abuse
 * — HTTPS is never blocked, so this works on every plan.
 */
export async function sendMail({ to, subject, html, text }: SendMailParams): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.log(`[mail:dev-fallback] To: ${to}\nSubject: ${subject}\n\n${text}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM || "Proof <no-reply@proof.app>",
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}

export function passwordResetEmail(resetUrl: string) {
  const text = `Reset your Proof password by opening this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="font-size: 18px; margin: 0 0 16px;">Reset your password</h1>
      <p style="font-size: 14px; color: #444; line-height: 1.5;">
        Click the button below to choose a new password. This link expires in 1 hour and can only be used once.
      </p>
      <a href="${resetUrl}" style="display: inline-block; margin: 20px 0; background: #18181b; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">
        Reset password
      </a>
      <p style="font-size: 13px; color: #888; line-height: 1.5;">
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
    </div>`;
  return { subject: "Reset your Proof password", text, html };
}
