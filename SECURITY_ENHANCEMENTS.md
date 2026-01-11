# 🔒 Security Enhancements Guide

This guide outlines recommended security improvements for the Agentic RAG chatbot backend. These enhancements are optional but **highly recommended** for production deployments.

---

## 📋 Current Security Status

### ✅ Already Implemented

- **Helmet.js**: Security headers (XSS, clickjacking protection)
- **CORS**: Cross-origin resource sharing configured
- **JWT Authentication**: Token-based authentication
- **Input Sanitization**: Request validation and sanitization
- **Rate Limiting**: Per-user and global rate limits
- **HTTPS**: Automatic on Render and Vercel
- **Non-root Docker User**: Container security
- **Environment Variables**: Secrets not in code

### ⚠️ Recommended Improvements

1. **HTTP-only Cookies** - Replace localStorage with secure cookies
2. **CSRF Protection** - Prevent cross-site request forgery
3. **Token Refresh** - Implement refresh token mechanism
4. **API Key Rotation** - Regular key rotation system
5. **Request Signing** - Verify request authenticity

---

## 🍪 1. HTTP-Only Cookies (High Priority)

### Current Issue

JWT tokens are stored in `localStorage`, which is vulnerable to XSS attacks.

### Solution

Store tokens in HTTP-only cookies that JavaScript cannot access.

### Implementation

#### Backend Changes

**File**: `src/controllers/auth.controller.js`

```javascript
// After generating JWT token, set it as HTTP-only cookie
res.cookie('auth_token', token, {
    httpOnly: true,           // Cannot be accessed by JavaScript
    secure: env.isProduction, // HTTPS only in production
    sameSite: 'strict',       // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
});

// Response (don't send token in JSON anymore)
res.json({
    success: true,
    user: {
        id: user._id,
        email: user.email,
        name: user.profile.name,
        picture: user.profile.picture,
        role: user.role,
        isAdmin: user.isAdmin(),
    },
});
```

**File**: `src/middleware/auth.middleware.js`

```javascript
export const authenticateJWT = async (req, res, next) => {
    try {
        // Read token from cookie instead of Authorization header
        const token = req.cookies.auth_token;

        if (!token) {
            throw new AuthenticationError('No authentication token provided');
        }

        // Rest of the code remains the same
        const decoded = jwt.verify(token, env.jwtSecret);
        const user = await User.findById(decoded.userId);
        
        if (!user || user.status !== 'active') {
            throw new AuthenticationError('Invalid user');
        }

        req.user = user;
        req.userId = user._id;
        next();
    } catch (error) {
        next(error);
    }
};
```

**File**: `src/app.js`

```javascript
import cookieParser from 'cookie-parser';

// Add cookie parser middleware
app.use(cookieParser());

// Update CORS to allow credentials
app.use(
    cors({
        origin: env.frontendUrl,
        credentials: true, // Important!
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-Request-ID'],
    })
);
```

**Install dependency**:
```bash
npm install cookie-parser
```

#### Frontend Changes

**File**: `src/contexts/AuthContext.jsx`

```javascript
// Remove localStorage usage
const login = async (googleCredential) => {
    try {
        const res = await fetch(`${API_BASE}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Important! Send cookies
            body: JSON.stringify({ credential: googleCredential })
        });

        if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            // No need to store token - it's in HTTP-only cookie
            return { success: true };
        }
    } catch (error) {
        return { success: false, error: 'Login failed' };
    }
};

const logout = async () => {
    try {
        await fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        setUser(null);
    } catch (error) {
        console.error('Logout error:', error);
    }
};
```

**Update all API calls**:
```javascript
// Add credentials: 'include' to all fetch calls
fetch(url, {
    credentials: 'include',
    // ... other options
});
```

---

## 🛡️ 2. CSRF Protection (High Priority)

### Why Needed

With cookie-based auth, you need CSRF protection to prevent cross-site attacks.

### Implementation

**Install dependency**:
```bash
npm install csurf
```

**File**: `src/app.js`

```javascript
import csrf from 'csurf';

// Add CSRF protection (after cookie parser)
const csrfProtection = csrf({ cookie: true });

// Apply to state-changing routes
app.use('/api/chat', csrfProtection);
app.use('/api/admin', csrfProtection);
app.use('/api/auth/logout', csrfProtection);

// Endpoint to get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});
```

**Frontend**:
```javascript
// Get CSRF token on app load
const [csrfToken, setCsrfToken] = useState(null);

useEffect(() => {
    fetch(`${API_BASE}/api/csrf-token`, {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => setCsrfToken(data.csrfToken));
}, []);

// Include in POST requests
fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
    },
    body: JSON.stringify(data)
});
```

---

## 🔄 3. Token Refresh Mechanism (Medium Priority)

### Why Needed

Short-lived access tokens with refresh tokens improve security.

### Implementation

**File**: `src/controllers/auth.controller.js`

```javascript
async googleLogin(req, res, next) {
    try {
        // ... existing code to verify and create user ...

        // Generate short-lived access token (15 minutes)
        const accessToken = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            env.jwtSecret,
            { expiresIn: '15m' }
        );

        // Generate long-lived refresh token (7 days)
        const refreshToken = jwt.sign(
            { userId: user._id, type: 'refresh' },
            env.jwtRefreshSecret,
            { expiresIn: '7d' }
        );

        // Store refresh token in database
        user.refreshToken = refreshToken;
        await user.save();

        // Set cookies
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: env.isProduction,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: env.isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ success: true, user: { /* user data */ } });
    } catch (error) {
        next(error);
    }
}

// New endpoint to refresh access token
async refreshToken(req, res, next) {
    try {
        const refreshToken = req.cookies.refresh_token;

        if (!refreshToken) {
            throw new AuthenticationError('No refresh token');
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);

        if (decoded.type !== 'refresh') {
            throw new AuthenticationError('Invalid token type');
        }

        // Get user and verify refresh token
        const user = await User.findById(decoded.userId);

        if (!user || user.refreshToken !== refreshToken) {
            throw new AuthenticationError('Invalid refresh token');
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            env.jwtSecret,
            { expiresIn: '15m' }
        );

        // Set new access token cookie
        res.cookie('access_token', newAccessToken, {
            httpOnly: true,
            secure: env.isProduction,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}
```

**Add to User model**:
```javascript
// src/models/user.model.js
refreshToken: {
    type: String,
    default: null
}
```

**Frontend**: Automatically refresh when access token expires
```javascript
// Intercept 401 errors and refresh token
const fetchWithRefresh = async (url, options) => {
    let res = await fetch(url, { ...options, credentials: 'include' });

    if (res.status === 401) {
        // Try to refresh token
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
        });

        if (refreshRes.ok) {
            // Retry original request
            res = await fetch(url, { ...options, credentials: 'include' });
        } else {
            // Refresh failed, logout
            logout();
        }
    }

    return res;
};
```

---

## 🔐 4. Additional Security Headers

### Implementation

**File**: `src/app.js`

```javascript
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", env.frontendUrl],
                frameSrc: ["https://accounts.google.com"],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin'
        }
    })
);
```

---

## 🔑 5. API Key Rotation

### Implementation

**File**: `src/models/apiKey.model.js` (new file)

```javascript
import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
    name: String,
    key: String,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ApiKey', apiKeySchema);
```

**Rotation script**:
```javascript
// scripts/rotate-keys.js
async function rotateApiKeys() {
    // 1. Generate new keys
    // 2. Update environment variables
    // 3. Invalidate old keys after grace period
}
```

---

## 📊 Security Checklist

### Before Production

- [ ] Implement HTTP-only cookies
- [ ] Add CSRF protection
- [ ] Set up token refresh
- [ ] Configure security headers
- [ ] Set up API key rotation
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Conduct security audit
- [ ] Test all security features
- [ ] Document security policies

### Ongoing

- [ ] Rotate API keys monthly
- [ ] Review access logs weekly
- [ ] Update dependencies monthly
- [ ] Monitor for security vulnerabilities
- [ ] Review and update CORS policies
- [ ] Test authentication flows
- [ ] Backup database regularly

---

## 🔍 Testing Security

### Test CSRF Protection

```bash
# Should fail without CSRF token
curl -X POST https://your-app.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

### Test Cookie Security

```javascript
// In browser console
document.cookie // Should NOT show auth_token
```

### Test Token Expiry

```javascript
// Wait for access token to expire (15 min)
// Should automatically refresh
```

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Cookie Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

---

## ⚠️ Important Notes

1. **Breaking Changes**: Implementing these changes will require frontend updates
2. **Testing**: Test thoroughly in development before deploying
3. **Migration**: Plan migration strategy for existing users
4. **Documentation**: Update API documentation
5. **Monitoring**: Set up alerts for security events

---

**Priority**: Implement HTTP-only cookies and CSRF protection first, then add token refresh and other enhancements.

**Timeline**: Allow 2-3 days for implementation and testing.

**Questions?** Refer to the resources above or consult with a security expert.
