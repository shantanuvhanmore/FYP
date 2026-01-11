# 🔮 Future Features Activation Guide

This guide shows exactly what to do when you're ready to activate prepared features.

---

## 1️⃣ Google OAuth Authentication

### Prerequisites
- [ ] Google Cloud Console account
- [ ] OAuth 2.0 credentials created

### Steps

#### A. Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Client Secret

#### B. Install Dependencies
```bash
npm install passport passport-google-oauth20 jsonwebtoken
```

#### C. Update Environment
Add to `.env`:
```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
JWT_SECRET=your-random-secret-key
```

#### D. Create Auth Routes
Create `src/routes/auth.routes.js`:
```javascript
import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import env from '../config/environment.js';

const router = express.Router();

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: env.googleClientId,
    clientSecret: env.googleClientSecret,
    callbackURL: env.googleCallbackUrl,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await User.findOrCreateFromGoogle(profile);
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Auth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, role: req.user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );
    
    res.redirect(`${env.frontendUrl}/auth/callback?token=${token}`);
  }
);

export default router;
```

#### E. Update Auth Middleware
In `src/middleware/auth.middleware.js`, replace placeholders:
```javascript
import jwt from 'jsonwebtoken';
import env from '../config/environment.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';

export const authenticateJWT = (req, res, next) => {
  const token = req.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new AuthenticationError('No authentication token provided');
  }
  
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }
  
  if (req.user.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }
  
  next();
};
```

#### F. Mount Auth Routes
In `src/routes/index.js`, add:
```javascript
import authRoutes from './auth.routes.js';

router.use('/api/auth', authRoutes);
```

#### G. Update Chat Routes
In `src/routes/chat.routes.js`, change:
```javascript
// From:
optionalAuth

// To:
authenticateJWT
```

#### H. Test
```bash
# Start server
npm run dev

# Visit in browser
http://localhost:3000/api/auth/google
```

---

## 2️⃣ Chat History & Saved Chats

### Steps

#### A. Enable Conversation Saving
In `src/controllers/chat.controller.js`, uncomment lines 50-60:
```javascript
// Save to conversation history
if (userId && !userId.startsWith('anon-')) {
  await Conversation.create({
    userId,
    sessionId: result.sessionId,
    query,
    response: result.answer,
    contexts: result.contexts,
    cached: result.cached,
    elapsed: result.elapsed,
  });
}
```

#### B. Implement History Endpoint
In `src/controllers/chat.controller.js`, replace `getChatHistory`:
```javascript
getChatHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, savedOnly = false } = req.query;
  const userId = req.user.id;

  const result = await Conversation.getUserHistory(
    userId,
    parseInt(page),
    parseInt(limit),
    savedOnly === 'true'
  );

  res.json(paginatedResponse(
    result.conversations,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
    'Chat history retrieved'
  ));
});
```

#### C. Implement Save Conversation
Replace `saveConversation`:
```javascript
saveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.body;
  const userId = req.user.id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId,
  });

  if (!conversation) {
    throw new NotFoundError('Conversation');
  }

  await conversation.markAsSaved();

  res.json(successResponse(
    { conversationId },
    'Conversation saved successfully'
  ));
});
```

#### D. Update Routes
In `src/routes/chat.routes.js`, change:
```javascript
// From:
optionalAuth

// To:
authenticateJWT
```

#### E. Test
```bash
# Get history
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/chat/history?page=1&limit=20

# Save conversation
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "CONVERSATION_ID"}' \
  http://localhost:3000/api/chat/save
```

---

## 3️⃣ Feedback System

### Steps

#### A. Implement Feedback Endpoint
In `src/controllers/chat.controller.js`, replace `submitFeedback`:
```javascript
submitFeedback = asyncHandler(async (req, res) => {
  const { conversationId, rating, comment } = req.body;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new NotFoundError('Conversation');
  }

  await conversation.addFeedback(rating, comment);

  res.json(successResponse(
    { conversationId },
    'Feedback submitted successfully'
  ));
});
```

#### B. Test
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "CONVERSATION_ID",
    "rating": "positive",
    "comment": "Very helpful!"
  }' \
  http://localhost:3000/api/chat/feedback
```

---

## 4️⃣ Admin Dashboard

### Steps

#### A. Enable Analytics Tracking
In `src/controllers/chat.controller.js`, add after line 60:
```javascript
// Track analytics
if (env.enableAnalytics) {
  await Analytics.recordRequest({
    success: true,
    elapsed: result.elapsed,
    cached: result.cached,
    userId,
    queryLength: query.length,
    contextsCount: result.contexts.length,
  });
}
```

#### B. Implement Admin Endpoints
In `src/controllers/admin.controller.js`, replace placeholders:

**Clear Cache:**
```javascript
clearCache = asyncHandler(async (req, res) => {
  const success = await cacheService.clear();

  if (!success) {
    throw new Error('Failed to clear cache');
  }

  logger.info('Cache cleared by admin', {
    adminId: req.user.id,
    adminEmail: req.user.email,
  });

  res.json(successResponse(
    { cleared: true },
    'Cache cleared successfully'
  ));
});
```

**Get Analytics:**
```javascript
getAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, period = 'daily' } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const analytics = await Analytics.getAnalytics(start, end, period);
  const summary = await Analytics.getSummary(7);

  res.json(analyticsResponse(
    {
      records: analytics,
      summary,
    },
    period,
    start,
    end
  ));
});
```

**Get Conversations:**
```javascript
getConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    Conversation.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v')
      .lean(),
    Conversation.countDocuments(),
  ]);

  res.json(paginatedResponse(
    conversations,
    parseInt(page),
    parseInt(limit),
    total,
    'Conversations retrieved'
  ));
});
```

#### C. Create Admin User
```javascript
// Run this once to create admin user
import User from './src/models/user.model.js';

const admin = await User.create({
  email: 'admin@example.com',
  profile: { name: 'Admin User' },
  role: 'admin',
});
```

#### D. Test Admin Endpoints
```bash
# Get analytics
curl -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  http://localhost:3000/api/admin/analytics?period=daily

# Clear cache
curl -X POST \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  http://localhost:3000/api/admin/cache/clear
```

---

## 5️⃣ Frontend Integration

### React Example

```javascript
// Chat component
const sendMessage = async (query) => {
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // If authenticated
    },
    body: JSON.stringify({ query }),
  });
  
  const data = await response.json();
  return data;
};

// Get chat history
const getHistory = async (page = 1) => {
  const response = await fetch(
    `http://localhost:3000/api/chat/history?page=${page}&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const data = await response.json();
  return data;
};
```

---

## ✅ Activation Checklist

### Google OAuth
- [ ] Get Google OAuth credentials
- [ ] Install passport packages
- [ ] Create auth routes
- [ ] Update auth middleware
- [ ] Test login flow

### Chat History
- [ ] Uncomment conversation saving
- [ ] Implement history endpoint
- [ ] Implement save endpoint
- [ ] Update routes to require auth
- [ ] Test retrieval

### Feedback
- [ ] Implement feedback endpoint
- [ ] Test submission
- [ ] Add frontend UI

### Admin Dashboard
- [ ] Enable analytics tracking
- [ ] Implement admin endpoints
- [ ] Create admin user
- [ ] Build admin frontend
- [ ] Test all admin features

---

## 📚 Additional Resources

- [Passport.js Documentation](http://www.passportjs.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [MongoDB Indexes](https://docs.mongodb.com/manual/indexes/)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
