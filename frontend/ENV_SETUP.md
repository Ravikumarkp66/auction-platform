# Environment Variables Setup

Create a `.env.local` file in the frontend directory with the following variables:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=137237976719-tom4ebrn5so6n3jvobj6ni9bhh9fret3.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

## Instructions:

### 1. Get GOOGLE_CLIENT_SECRET from Google Cloud Console:
- Go to: https://console.cloud.google.com/apis/credentials
- Select your project
- Find the OAuth 2.0 Client ID with the above client ID
- Click "Download JSON" or copy the Client Secret

### 2. Generate NEXTAUTH_SECRET:
Run one of these commands:
```bash
openssl rand -base64 32
```
Or:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Set up Authorized Redirect URI in Google Cloud Console:
- Add: `http://localhost:3000/api/auth/callback/google`
- For production: `https://yourdomain.com/api/auth/callback/google`

### 4. Create the .env.local file:
Copy the variables above to `.env.local` and fill in the missing values.

## Testing:
After setting up the environment variables, restart your development server and test the Google authentication by clicking the "Sign in" button in the navigation bar.
