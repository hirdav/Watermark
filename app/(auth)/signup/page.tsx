import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormMessage } from "@/components/auth/FormMessage";
import { TrustNote } from "@/components/auth/TrustNote";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function signupAction(formData: FormData) {
    "use server";
    const ip = getClientIp(await headers());
    const { allowed } = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) redirect("/signup?error=rate-limited");

    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;
    const name = (formData.get("name") as string)?.trim() || undefined;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      redirect("/signup?error=invalid-email");
    }
    if (!password || password.length < 8) {
      redirect("/signup?error=invalid-password");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      redirect("/signup?error=exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { email, passwordHash, name } });

    try {
      await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login");
      }
      throw err;
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Create your account</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Start protecting your client proofs in minutes.</p>

        <form action={signupAction} className="mt-7 flex flex-col gap-4">
          {error === "exists" && (
            <FormMessage kind="error">
              An account with that email already exists. <Link href="/login" className="underline">Log in instead</Link>.
            </FormMessage>
          )}
          {error === "invalid-email" && <FormMessage kind="error">Please enter a valid email address.</FormMessage>}
          {error === "invalid-password" && <FormMessage kind="error">Password must be at least 8 characters.</FormMessage>}
          {error === "rate-limited" && (
            <FormMessage kind="error">Too many signup attempts. Please wait a while and try again.</FormMessage>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Your name or studio name"
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-50/10"
            />
          </div>

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

          <PasswordField
            name="password"
            label="Password"
            autoComplete="new-password"
            minLength={8}
            showStrength
            hint="At least 8 characters."
          />

          <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            Log in
          </Link>
        </p>
      </div>
      <TrustNote />
    </div>
  );
}
