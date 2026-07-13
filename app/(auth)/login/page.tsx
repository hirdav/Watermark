import { AuthError } from "next-auth";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormMessage } from "@/components/auth/FormMessage";
import { TrustNote } from "@/components/auth/TrustNote";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string; reset?: string }>;
}) {
  const { error, callbackUrl, reset } = await searchParams;
  const redirectTo = callbackUrl || "/dashboard";

  async function loginAction(formData: FormData) {
    "use server";
    const email = formData.get("email");
    const password = formData.get("password");
    const target = (formData.get("callbackUrl") as string) || "/dashboard";

    const ip = getClientIp(await headers());
    const { allowed } = rateLimit(`login:${ip}`, 10, 10 * 60 * 1000);
    if (!allowed) {
      redirect(`/login?error=rate-limited&callbackUrl=${encodeURIComponent(target)}`);
    }

    try {
      await signIn("credentials", { email, password, redirectTo: target });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=1&callbackUrl=${encodeURIComponent(target)}`);
      }
      throw err;
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Welcome back</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Log in to manage your projects and client galleries.</p>

        <form action={loginAction} className="mt-7 flex flex-col gap-4">
          <input type="hidden" name="callbackUrl" value={redirectTo} />

          {reset === "success" && <FormMessage kind="success">Password updated — log in with your new password.</FormMessage>}
          {error === "rate-limited" ? (
            <FormMessage kind="error">Too many login attempts. Please wait a few minutes and try again.</FormMessage>
          ) : (
            error && <FormMessage kind="error">Invalid email or password. Please try again.</FormMessage>
          )}

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
            autoComplete="current-password"
            labelExtra={
              <Link href="/forgot-password" className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100">
                Forgot password?
              </Link>
            }
          />

          <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          No account?{" "}
          <Link href="/signup" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            Sign up free
          </Link>
        </p>
      </div>
      <TrustNote />
    </div>
  );
}
