# Rate Limit & Feedback - Quick Reference Guide

## 🎯 Overview

This implementation provides:
1. **Token-based rate limiting** with visual progress bar
2. **Request-based rate limiting** 
3. **Like/Dislike feedback** system with admin analytics

## 📊 How It Works

### Token Limiting Flow

```
User sends message
    ↓
Backend checks Settings (enabled? type? limit?)
    ↓
Validates user.usage.dailyTokens/dailyQueries
    ↓
If exceeded → Return 429 error
    ↓
If OK → Process chat with GPT
    ↓
Extract token usage from GPT response
    ↓
Increment user.usage.dailyTokens & dailyQueries
    ↓
Return response with token data
    ↓
Frontend updates progress bar
```

### Feedback Flow

```
User clicks 👍 or 👎 on bot message
    ↓
Frontend updates UI optimistically
    ↓
PATCH /api/conversations/messages/:id/feedback
    ↓
Backend updates Message.feedback
    ↓
Backend updates Log.feedback (for analytics)
    ↓
Admin can filter logs by feedback type
```

## 🔧 Admin Configuration

### Access Admin Dashboard
1. Login as admin user
2. Navigate to `/admin`
3. Click "Limit" tab

### Configure Rate Limits

**Enable/Disable**
- Toggle switch to enable rate limiting globally

**Limit Type**
- **Requests**: Limit by number of chat requests (e.g., 10 requests/day)
- **Tokens**: Limit by GPT token usage (e.g., 5000 tokens/day)

**Set Limits**
- Request Limit: 1 - 10,000 requests/day
- Token Limit: 100 - 1,000,000 tokens/day

**Default Settings**
```javascript
{
  enabled: false,
  type: 'requests',
  requestLimit: 10,
  tokenLimit: 5000
}
```

## 📱 User Experience

### Token Progress Bar (When Enabled)

**Normal Usage (< 90%)**
```
⚡ Token Usage
1,234 / 5,000
[████████░░░░░░░░░░░░] (Purple gradient)
```

**Near Limit (> 90%)**
```
⚡ Token Usage
4,567 / 5,000
[████████████████████] (Orange→Red gradient, pulsing)
```

**Limit Reached**
```
⚡ Token Usage
5,000 / 5,000
[████████████████████] (Red)
⚠️ Daily token limit reached. Please try again tomorrow.
[Input disabled]
```

### Feedback Buttons

**Bot Message Actions**
```
[Bot Response]
👍 👎 📋
```

**States**
- Default: Gray outline
- Liked: Green background
- Disliked: Red background
- Disabled: Grayed out (when message ID not available)

## 🗄️ Database Schema

### User Model
```javascript
{
  usage: {
    dailyTokens: Number,      // Tokens used today
    dailyQueries: Number,     // Requests made today
    dailyResetAt: Date,       // When counters reset
    totalQueries: Number,     // All-time total
    lastQueryAt: Date         // Last activity
  }
}
```

### Settings Model (Singleton)
```javascript
{
  rateLimit: {
    enabled: Boolean,         // Global enable/disable
    type: String,             // 'requests' or 'tokens'
    requestLimit: Number,     // Max requests/day
    tokenLimit: Number        // Max tokens/day
  }
}
```

### Message Model
```javascript
{
  conversationId: ObjectId,
  sender: String,             // 'user' or 'bot'
  content: String,
  feedback: String,           // 'none', 'liked', 'disliked'
  metadata: {
    tokens: Number,
    responseTime: Number,
    sources: [String]
  }
}
```

### Log Model (Analytics)
```javascript
{
  user_id: ObjectId,
  conversation_id: ObjectId,
  message_id: ObjectId,
  input: String,
  output: String,
  feedback: String,           // Synced with Message.feedback
  tokens_used: Number,
  response_time: Number
}
```

## 🔑 API Endpoints

### Chat Endpoint
```
POST /api/chat
Authorization: Bearer <token>

Request:
{
  "query": "What programs do you offer?",
  "conversationId": "optional-conversation-id"
}

Response (Success):
{
  "success": true,
  "answer": "We offer...",
  "conversationId": "...",
  "messageId": "...",
  "tokens_used": 1234,
  "total_tokens": 5000,
  "session_exhausted": false,
  "rateLimit": {
    "type": "tokens",
    "limit": 5000,
    "current": 1234,
    "resetAt": "2026-01-12T10:00:00Z"
  }
}

Response (Rate Limit Exceeded):
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "You have reached your daily limit...",
  "limitType": "tokens",
  "current": 5000,
  "limit": 5000,
  "resetAt": "2026-01-12T10:00:00Z"
}
```

### Feedback Endpoint
```
PATCH /api/conversations/messages/:messageId/feedback
Authorization: Bearer <token>

Request:
{
  "feedback": "liked"  // or "disliked" or "none"
}

Response:
{
  "success": true,
  "data": { ...message },
  "message": "Feedback updated successfully"
}
```

### Admin Endpoints
```
GET /api/admin/rate-limit
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "data": {
    "enabled": true,
    "type": "tokens",
    "requestLimit": 10,
    "tokenLimit": 5000
  }
}

POST /api/admin/rate-limit
Authorization: Bearer <admin-token>

Request:
{
  "enabled": true,
  "type": "tokens",
  "requestLimit": 10,
  "tokenLimit": 5000
}
```

## 🛠️ Troubleshooting

### Token Progress Bar Not Showing
- Check if rate limiting is enabled in Admin Dashboard
- Verify `total_tokens` is being returned in API response
- Check browser console for errors

### Feedback Buttons Not Working
- Verify message has valid `id` (messageId from API)
- Check network tab for PATCH request
- Ensure user owns the conversation

### Rate Limit Not Resetting
- Check `user.usage.dailyResetAt` in database
- Verify it's set to 24 hours from first request
- Backend auto-resets on next request after 24h

### Admin Can't Access Settings
- Verify user has `role: 'admin'` in database
- Check JWT token includes admin role
- Ensure admin middleware is working

## 📈 Analytics

### Admin Dashboard - Logs Tab

**Filter Options**
- Time Range: 1h, 24h, 7d, All
- Feedback: All, Liked 👍, Disliked 👎, No Feedback

**Displayed Data**
- User email
- Conversation title
- Timestamp
- Feedback badge
- Input/Output preview

### Admin Dashboard - Conversations Tab

**Metrics Per Conversation**
- Total messages
- Liked count 👍
- Disliked count 👎
- Created date

### Admin Dashboard - Users Tab

**Statistics**
- Total users
- Active users (7 days)
- Total queries
- Today's queries
- Top users by query count

## 🔒 Security Notes

1. **Admin Bypass**: Users with `role: 'admin'` bypass all rate limits
2. **JWT Required**: All endpoints require valid JWT token
3. **Ownership Verification**: Feedback endpoint verifies conversation ownership
4. **Input Validation**: Limits validated on both frontend and backend
5. **Rate Limit Headers**: Response includes `X-RateLimit-*` headers

## 🚀 Performance Considerations

1. **Tiktoken Caching**: Encoder initialized once at startup
2. **Database Indexes**: Indexed on `user_id`, `feedback`, `createdAt`
3. **Optimistic Updates**: Frontend updates UI before API confirmation
4. **Fallback Estimation**: Uses 1 token ≈ 4 chars if tiktoken fails
5. **Non-blocking Logs**: Log creation errors don't block chat response

## 📝 Environment Variables

No new environment variables required. Uses existing:
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - Token signing
- `ADMIN_EMAILS` - Admin user emails

## 🎨 Customization

### Change Token Limit Colors
Edit `src/pages/ChatPage.css`:
```css
.token-progress-fill {
  background: linear-gradient(90deg, #your-color-1, #your-color-2);
}

.token-progress-fill.near-limit {
  background: linear-gradient(90deg, #warning-color-1, #warning-color-2);
}
```

### Change Default Limits
Edit `src/models/settings.model.js`:
```javascript
requestLimit: {
  type: Number,
  default: 10,  // Change this
}
tokenLimit: {
  type: Number,
  default: 2000,  // Change this
}
```

### Adjust Reset Period
Currently hardcoded to 24 hours. To change, edit `src/controllers/chat.controller.js`:
```javascript
// Change this line:
user.usage.dailyResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
// To (example: 12 hours):
user.usage.dailyResetAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
```
