import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  const redirectTo = callbackUrl || "/dashboard";

  async function loginAction(formData: FormData) {
    "use server";
    const email = formData.get("email");
    const password = formData.get("password");
    const target = (formData.get("callbackUrl") as string) || "/dashboard";

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
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Log in</h1>
      <p className="mt-1 text-sm text-zinc-500">Sign in to manage your shoots.</p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Invalid email or password.
        </p>
      )}

      <form action={loginAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={redirectTo} />
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
          <input
            type="email"
            name="email"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
          <input
            type="password"
            name="password"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Log in
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-500">
        No account?{" "}
        <Link href="/signup" className="font-medium text-zinc-900 underline dark:text-zinc-50">
          Sign up
        </Link>
      </p>
    </div>
  );
}
