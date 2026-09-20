import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const config: NextAuthConfig = {
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.active) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.businessName,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.uid = Number(user.id);
      }
      return token;
    },
    async session({ session, token }) {
      // session.user.id is typed `never` (our numeric id intersects Auth.js's
      // default `id?: string`), so narrow once here; every other file only
      // reads it, which typechecks fine.
      const user = session.user as unknown as {
        id: number;
        role: "ADMIN" | "VENDOR";
      };
      if (token.role) user.role = token.role;
      if (token.uid !== undefined) user.id = token.uid;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
