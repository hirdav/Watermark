import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendMail } from "@/lib/mail";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormMessage } from "@/components/auth/FormMessage";

export const metadata = { title: "Contact — Proof" };

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  async function sendContactAction(formData: FormData) {
    "use server";
    const ip = getClientIp(await headers());
    const { allowed } = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) redirect("/contact?error=rate-limited");

    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const message = (formData.get("message") as string)?.trim();
    if (!name || !email || !message) redirect("/contact");

    const to = process.env.CONTACT_EMAIL || "hello@proof.app";
    try {
      await sendMail({
        to,
        subject: `Contact form: ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`,
        html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p>${message.replace(/\n/g, "<br/>")}</p>`,
      });
    } catch (err) {
      console.error("[contact] sendMail failed:", err);
      redirect("/contact?error=1");
    }

    redirect("/contact?sent=1");
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Contact us</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Questions about plans, billing, or the product? Send a message and we&apos;ll get back to you.
      </p>

      {sent ? (
        <div className="mt-8">
          <FormMessage kind="success">Thanks — your message is on its way. We&apos;ll reply by email.</FormMessage>
        </div>
      ) : (
        <form action={sendContactAction} className="mt-8 flex flex-col gap-4">
          {error === "rate-limited" ? (
            <FormMessage kind="error">Too many messages sent. Please wait a while and try again.</FormMessage>
          ) : (
            error && (
              <FormMessage kind="error">
                Something went wrong sending your message. Please try again in a moment.
              </FormMessage>
            )
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition-colors focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-50/10"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition-colors focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-50/10"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              className="mt-1.5 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition-colors focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-50/10"
            />
          </div>
          <SubmitButton pendingText="Sending…">Send message</SubmitButton>
        </form>
      )}
    </div>
  );
}
