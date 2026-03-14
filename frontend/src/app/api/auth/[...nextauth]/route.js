import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Check for admin credentials
        if (
          credentials.email === "admin.15feblsrbp@gmail.com" &&
          credentials.password === "15feblsrbp@mar15"
        ) {
          return {
            id: "1",
            email: "admin.15feblsrbp@gmail.com",
            name: "Admin",
            role: "admin"
          };
        }
        
        // For demo purposes, create a regular user
        if (credentials.email && credentials.password) {
          return {
            id: "2",
            email: credentials.email,
            name: credentials.email.split('@')[0],
            role: "user"
          };
        }
        
        return null;
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role;
        token.picture = user.picture || account?.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.image = token.picture || session.user.image;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };
