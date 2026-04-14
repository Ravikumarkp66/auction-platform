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
        const adminEmails = ["lakshmish4638@gmail.com", "mreducator4566@gmail.com", "ravikumarkp66@gmail.com"];
        const email = credentials.email.toLowerCase();
        
        // Check for admin credentials
        if (
          adminEmails.includes(email) &&
          credentials.password === "15FEBLSRBP"
        ) {
          return {
            id: email,
            email: email,
            name: "Admin",
            role: "admin"
          };
        }
        
        // For demo purposes, create a regular user
        if (email && credentials.password) {
          // If they used an admin email but wrong password, reject them
          if (adminEmails.includes(email)) {
            return null;
          }
          return {
            id: email,
            email: email,
            name: email.split('@')[0],
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
        const adminEmails = ["lakshmish4638@gmail.com", "mreducator4566@gmail.com", "ravikumarkp66@gmail.com"];
        const userEmail = (user.email || "").toLowerCase();
        token.role = user.role || (adminEmails.includes(userEmail) ? "admin" : "user");
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
