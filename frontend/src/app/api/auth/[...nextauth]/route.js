import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { API_URL } from "@/lib/apiConfig";

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const email = (credentials.email || "").toLowerCase().trim();
          const password = (credentials.password || "").trim();

          const loginUrl = `${API_URL}/api/auth/login`;
          console.log(`[AUTH] Attempting login at: ${loginUrl}`);

          const res = await fetch(loginUrl, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            headers: { "Content-Type": "application/json" }
          });

          const data = await res.json();

          if (res.ok && data.success && data.user) {
            console.log(`[AUTH] Login successful for: ${email}`);
            return data.user;
          }
          
          console.warn(`[AUTH] Login failed for ${email}: ${data.message || 'Invalid status'}`);
          return null;
        } catch (err) {
          console.error("[AUTH] Fetch error during login:", err.message);
          return null;
        }
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
        // 1. Role Assignment
        const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map(e => e.trim());
        const userEmail = (user.email || "").toLowerCase().trim();

        if (adminEmails.includes(userEmail)) {
          token.role = "admin";
        } else {
          token.role = (user.role || "user").toLowerCase();
        }

        // 2. Token Sync (Backend JWT)
        if (user.token) {
          // Credentials login provides the token directly
          token.accessToken = user.token;
        } else if (account?.provider === "google") {
          // Google login needs to sync with backend to get a valid JWT
          try {
            console.log("[AUTH SYNC] Synchronizing Google User with Backend:", userEmail);
            const res = await fetch(`${API_URL}/api/auth/google-sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: userEmail })
            });
            const data = await res.json();
            if (data.success && data.token) {
              token.accessToken = data.token;
              console.log("[AUTH SYNC] Backend JWT acquired successfully");
            } else {
              console.warn("[AUTH SYNC] Backend returned success but no token (likely not an admin)");
            }
          } catch (err) {
            console.error("[AUTH SYNC] Backend sync failed:", err.message);
          }
        }
        
        token.picture = user.picture || account?.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.image = token.picture || session.user.image;
        session.accessToken = token.accessToken;
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
