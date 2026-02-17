import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Anmeldung",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const username = process.env.ADMIN_USERNAME ?? "admin";
        const password = process.env.ADMIN_PASSWORD;
        if (!password?.trim()) return null;
        if (
          credentials?.username === username &&
          credentials?.password === password
        ) {
          return { id: "1", name: username, email: `${username}@local` };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) Object.assign(token, user);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.AUTH_SECRET,
});

export { handler as GET, handler as POST };
