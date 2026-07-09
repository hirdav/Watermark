import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/password-reset";
import { passwordResetEmail, sendMail } from "@/lib/mail";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormMessage } from "@/components/auth/FormMessage";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  async function requestResetAction(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    if (!email) redirect("/forgot-password");

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await createPasswordResetToken(user.id);
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host");
      const proto = h.get("x-forwarded-proto") ?? "https";
      const resetUrl = `${proto}://${host}/reset-password/${token}`;
      const { subject, html, text } = passwordResetEmail(resetUrl);
      try {
        await sendMail({ to: email, subject, html, text });
      } catch (err) {
        // Don't let a mail-provider failure surface as a crash or leak
        // whether the account exists — log it and fall through to the
        // same generic success message.
        console.error("[forgot-password] sendMail failed:", err);
      }
    }

    // Always show the same message, whether or not the account exists,
    // so this form can't be used to discover which emails have accounts.
    redirect("/forgot-password?sent=1");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Reset your password</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Enter the email on your account and we&apos;ll send a link to reset your password.
        </p>

        {sent ? (
          <div className="mt-6">
            <FormMessage kind="success">
              If an account exists for that email, a reset link is on its way. It expires in 1 hour.
            </FormMessage>
            <Link
              href="/login"
              className="mt-5 inline-block text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              ← Back to log in
            </Link>
          </div>
        ) : (
          <form action={requestResetAction} className="mt-7 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-50/10"
              />
            </div>
            <SubmitButton pendingText="Sending link…">Send reset link</SubmitButton>
            <Link
              href="/login"
              className="text-center text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
            >
              ← Back to log in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
