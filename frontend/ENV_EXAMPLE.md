# Frontend Environment Variables

Create a `.env.local` file in the frontend directory with the following variables:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com

# NextAuth Configuration
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## How to get these values:

### NEXT_PUBLIC_API_URL
- Your deployed backend URL on Render
- Example: https://auction-platform-backend.onrender.com

### NEXTAUTH_URL
- Your deployed frontend URL on Vercel
- Example: https://auction-platform.vercel.app

### NEXTAUTH_SECRET
- Generate a random secret: `openssl rand -base64 32`
- Or use: https://generate-secret.vercel.app/32

### Google OAuth Credentials
1. Go to Google Cloud Console
2. Create OAuth 2.0 Client ID
3. Add redirect URI: https://your-vercel-app.vercel.app/api/auth/callback/google
4. Copy Client ID and Client Secret
