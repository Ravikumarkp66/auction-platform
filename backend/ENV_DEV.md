# Backend Development Environment Variables

Create a `.env` file in the backend directory with these variables:

```bash
# MongoDB Configuration - Use local MongoDB for development
MONGO_URI=mongodb://localhost:27017/auction-platform

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

## For Production (Render):
Use your MongoDB Atlas connection string:
```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/auction-platform
NODE_ENV=production
```
