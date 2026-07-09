import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPasswordResetToken, consumePasswordResetToken } from "@/lib/password-reset";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormMessage } from "@/components/auth/FormMessage";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const userId = await verifyPasswordResetToken(token);

  async function resetAction(formData: FormData) {
    "use server";
    const tokenValue = formData.get("token") as string;
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    const userId = await verifyPasswordResetToken(tokenValue);
    if (!userId) redirect(`/reset-password/${tokenValue}?error=expired`);
    if (!password || password.length < 8) redirect(`/reset-password/${tokenValue}?error=short`);
    if (password !== confirm) redirect(`/reset-password/${tokenValue}?error=mismatch`);

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await consumePasswordResetToken(tokenValue);

    redirect("/login?reset=success");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {!userId ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Link expired</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              This password reset link is invalid or has already been used. Links expire after 1 hour.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Request a new link
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Choose a new password</h1>
            <p className="mt-1.5 text-sm text-zinc-500">Make it something you haven&apos;t used before.</p>

            <form action={resetAction} className="mt-7 flex flex-col gap-4">
              <input type="hidden" name="token" value={token} />

              {error === "short" && <FormMessage kind="error">Password must be at least 8 characters.</FormMessage>}
              {error === "mismatch" && <FormMessage kind="error">Passwords don&apos;t match.</FormMessage>}
              {error === "expired" && <FormMessage kind="error">That link just expired — request a new one.</FormMessage>}

              <PasswordField name="password" label="New password" autoComplete="new-password" minLength={8} showStrength hint="At least 8 characters." />
              <PasswordField name="confirm" label="Confirm new password" autoComplete="new-password" minLength={8} />

              <SubmitButton pendingText="Updating password…">Update password</SubmitButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
