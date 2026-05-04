# Authentication & Authorization Implementation Guide

This document explains the new security architecture implemented to protect your API.

## Overview

The system now uses **JWT (JSON Web Tokens)** for authentication and **role-based access control (RBAC)** for authorization.

## Architecture

### 1. Authentication Flow

```
Client requests → Check JWT in Authorization header → Validate token → Extract user info → Proceed
```

### 2. Authorization Flow

```
Authenticated request → Check user role → Compare with required roles → Allow/Deny access
```

## How to Use

### For Frontend Developers

#### 1. Getting a Token

After user login (via NextAuth), exchange credentials for JWT:

```javascript
// Example: Login and get token
const response = await fetch('http://localhost:5050/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'secure_password'
  })
});

const { token } = await response.json();
localStorage.setItem('authToken', token);
```

#### 2. Sending Authenticated Requests

Always include the token in the `Authorization` header:

```javascript
const token = localStorage.getItem('authToken');

const response = await fetch('http://localhost:5050/api/tournaments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Tournament Name',
    organizerName: 'Organizer',
    // ... other fields
  })
});

if (response.status === 401) {
  // Token expired or invalid
  // Redirect to login
  window.location.href = '/login';
}
```

### For Backend Developers

#### 1. Creating Protected Routes

```javascript
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorizationMiddleware');

// Public route
router.get('/public', (req, res) => {
  res.json({ message: 'Public data' });
});

// Admin-only route
router.post('/admin-action', 
  authMiddleware,           // Verify token
  authorize(['admin']),     // Check role
  async (req, res) => {
    // Your handler
  }
);

// Multiple roles
router.patch('/:id',
  authMiddleware,
  authorize(['admin', 'moderator']),
  async (req, res) => {
    // Your handler
  }
);
```

#### 2. Generating Tokens

```javascript
const { generateToken } = require('../utils/jwtUtils');

// Generate token after user login
const token = generateToken(userId, email, 'admin');
res.json({ token });
```

#### 3. Using req.user

After authentication, user info is attached to `req.user`:

```javascript
router.post('/create-tournament',
  authMiddleware,
  authorize(['admin']),
  async (req, res) => {
    console.log(req.user.id);     // User ID
    console.log(req.user.email);  // User email
    console.log(req.user.role);   // User role
    
    // Use for audit logging
    await logAction(
      req.user.id,
      'TOURNAMENT_CREATED',
      'Tournament',
      tournamentId
    );
  }
);
```

## User Roles

- **admin**: Full access to all operations
- **moderator**: Can moderate users and content (future)
- **user**: Regular user access (future)
- **viewer**: Read-only access (future)

## Protected Routes (Admin Only)

### Tournaments
- `POST /api/tournaments` - Create tournament
- `PUT /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament

### Players
- `POST /api/players` - Add player manually
- `POST /api/players/:id/approve` - Approve pending player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player
- `POST /api/players/import` - Bulk import

### Teams
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team

### Settings
- `POST /api/settings` - Update settings
- `POST /api/settings/upload-logo` - Upload logo

### Upload
- `POST /api/upload/proxy-url` - Proxy image upload
- `POST /api/upload/proxy-batch` - Batch proxy upload

## Public Routes (No Auth)

- `GET /api/health` - Health check
- `GET /api/settings` - Get settings
- `GET /api/tournaments` - Get tournaments
- `GET /api/players` - Get public player info
- `POST /api/players/register` - Player registration
- `GET /api/players/check` - Check registration status

## Token Expiration

Tokens expire after **7 days** (configurable via `JWT_EXPIRY` in `.env`).

Refresh tokens are not implemented yet - users need to re-login after expiration.

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthorized: No valid authorization header"
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden: Insufficient permissions",
  "requiredRoles": ["admin"],
  "userRole": "user"
}
```

### 400 Bad Request
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

## Security Best Practices

1. **Never expose tokens in logs**
   ```javascript
   // ❌ Wrong
   console.log('Token:', token);
   
   // ✅ Right
   console.log('Token validation successful');
   ```

2. **Store tokens securely** (Frontend)
   ```javascript
   // ✅ Use httpOnly cookies (best)
   // ⚠️ Use localStorage (if necessary)
   
   // ❌ Don't store in global variables
   ```

3. **Always validate on sensitive operations**
   ```javascript
   // ✅ Verify token on every admin action
   router.delete('/:id',
     authMiddleware,
     authorize(['admin']),
     async (req, res) => { ... }
   );
   ```

4. **Log important actions**
   ```javascript
   const { logAction } = require('../utils/auditLogger');
   
   await logAction(req.user.id, 'PLAYER_DELETED', 'Player', playerId);
   ```

## Troubleshooting

### "Token Expired"
**Solution**: User needs to login again to get a fresh token.

### "Invalid Token"
**Possible causes**:
- Token is malformed
- Token was modified
- Wrong JWT_SECRET used

**Solution**: Clear tokens and re-login.

### "Missing Authorization Header"
**Solution**: Ensure frontend is sending:
```
Authorization: Bearer <token>
```

## Next Steps

1. Implement login endpoint (`POST /api/auth/login`)
2. Add refresh token support
3. Implement password hashing with bcrypt
4. Add user model and database
5. Implement OAuth integration (Google, GitHub)
