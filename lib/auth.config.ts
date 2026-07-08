import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no providers/Prisma here, so this can be imported by
// middleware (which runs in the Edge runtime and can't load the Prisma
// client's Node.js-only dependencies).
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
