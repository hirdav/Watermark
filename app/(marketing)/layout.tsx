import { auth } from "@/lib/auth";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <Header loggedIn={!!session?.user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
