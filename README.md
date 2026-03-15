# 🏆 Auction Platform - Professional Cricket Auction System

A comprehensive role-based cricket auction platform with real-time bidding, admin controls, and public viewing capabilities.

## 🚀 Features

### 🔐 Authentication & Authorization
- **Dual Authentication**: Google OAuth + Email/Password with JWT
- **Role-Based Access Control**: Admin & User roles
- **Protected Routes**: Middleware-based route protection
- **Admin Credentials**: `admin.15feblsrbp@gmail.com` / `15feblsrbp@mar15`

### 🎯 Admin Features
- **Tournament Management**: Create, start, and manage tournaments
- **Team & Player Management**: Add teams, players, and icon players
- **Live Auction Control**: Real-time bidding control panel
- **Dashboard**: Statistics, quick actions, and recent activity
- **Settings**: Platform configuration and preferences

### 👥 Public Features
- **Live Auction Viewing**: Watch auctions in real-time
- **Tournament Listings**: View upcoming and completed tournaments
- **Responsive Design**: Works on all devices
- **Real-time Updates**: Socket.io integration for live updates

## 🏗️ Architecture

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **Authentication**: NextAuth.js v4
- **Styling**: Tailwind CSS
- **State Management**: React Hooks & Context
- **Real-time**: Socket.io Client

### Backend (Node.js)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **File Upload**: Multer
- **Authentication**: JWT & NextAuth integration

## 📁 Project Structure

```
KP/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Reusable components
│   │   └── context/         # React contexts
│   ├── public/              # Static assets
│   └── package.json
├── backend/                  # Express.js backend API
│   ├── controllers/         # Route controllers
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── uploads/            # File upload directory
│   └── package.json
├── README.md
└── .gitignore
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Ravikumarkp66/auction-platform.git
cd auction-platform
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file (see backend/.env.example):
```bash
MONGO_URI=mongodb://localhost:27017/auction-platform
PORT=5000
NODE_ENV=development
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create `.env.local` file (see frontend/ENV_EXAMPLE.md):
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Start Development Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 🚀 Deployment Guide

### Environment Variables Setup

#### Backend Environment Variables
Create `.env` file in backend directory:
```bash
# Required
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/auction-platform
PORT=5000
NODE_ENV=production

# Optional (for better security)
FRONTEND_URL=https://your-vercel-app.vercel.app

# Future AWS S3 Integration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
```

#### Frontend Environment Variables
Create `.env.local` file in frontend directory:
```bash
# Required
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key

# Required for Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Deployment Steps

#### 1. MongoDB Atlas Setup
1. Create cluster at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create database user with strong password
3. Whitelist all IP addresses (0.0.0.0/0) for Render
4. Get connection string and update `MONGO_URI`

#### 2. Backend Deployment (Render)
1. Connect GitHub repository to Render
2. Set environment variables in Render dashboard
3. Choose Node.js service type
4. Build command: `npm install`
5. Start command: `npm start`
6. Deploy automatically on push to main branch

#### 3. Frontend Deployment (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Build command: `npm run build`
4. Output directory: `.next`
5. Deploy automatically on push to main branch

#### 4. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-vercel-app.vercel.app/api/auth/callback/google`
4. Copy credentials to environment variables

### Production Features Implemented

✅ **WebSocket Support**: Properly configured for Render
✅ **Rate Limiting**: 100 requests per 15 minutes per IP
✅ **Error Handling**: Comprehensive error middleware
✅ **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT
✅ **MongoDB Retry Logic**: Automatic reconnection on failure
✅ **CORS Security**: Configurable origin restrictions
✅ **Health Check**: `/api/health` endpoint for monitoring
✅ **Environment Variables**: Properly documented and secured

## 🌐 Deployment

### Frontend Deployment (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Automatic deployment on push to main branch

### Backend Deployment (Railway/Render)
1. Connect GitHub repository
2. Set environment variables
3. Configure MongoDB connection
4. Deploy with automatic scaling

### Environment Variables

#### Frontend (.env.local)
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_nextauth_secret
```

#### Backend (.env)
```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/auction-platform
PORT=5000
NODE_ENV=production
```

## 🔑 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create new OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
4. Copy Client ID and Client Secret to environment variables

## 📱 Usage

### Admin Access
1. Login with admin credentials or Google OAuth
2. Access admin panel at `/admin/dashboard`
3. Create tournaments and manage auctions
4. Control live bidding in real-time

### Public Access
1. Visit `/auctions` to view live auctions
2. Watch real-time bidding without login
3. View tournament details and player information

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email ravikumarkp66@gmail.com or create an issue in the repository.

---

**Built with ❤️ for cricket enthusiasts**
