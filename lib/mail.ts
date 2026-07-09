import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends transactional email via SMTP when configured. Falls back to logging
 * the message server-side when no SMTP env vars are set — this keeps local
 * dev and this environment (no email provider account) fully functional
 * without ever exposing the message content to the client.
 */
export async function sendMail({ to, subject, html, text }: SendMailParams): Promise<void> {
  const client = getTransporter();
  if (!client) {
    console.log(`[mail:dev-fallback] To: ${to}\nSubject: ${subject}\n\n${text}`);
    return;
  }
  await client.sendMail({
    from: process.env.SMTP_FROM || "Proof <no-reply@proof.app>",
    to,
    subject,
    html,
    text,
  });
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
