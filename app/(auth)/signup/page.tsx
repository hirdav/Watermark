import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function signupAction(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;
    const name = (formData.get("name") as string)?.trim() || undefined;

    if (!email || !password || password.length < 8) {
      redirect("/signup?error=invalid");
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
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Create an account</h1>
      <p className="mt-1 text-sm text-zinc-500">Start protecting your client proofs.</p>

      {error === "exists" && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          An account with that email already exists.
        </p>
      )}
      {error === "invalid" && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Please enter a valid email and a password of at least 8 characters.
        </p>
      )}

      <form action={signupAction} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
          <input
            type="text"
            name="name"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
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
            minLength={8}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Sign up
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-50">
          Log in
        </Link>
      </p>
    </div>
  );
}
