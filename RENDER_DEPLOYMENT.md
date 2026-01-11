# 🚀 Deployment Guide: Render (Backend)

Complete guide for deploying the Agentic RAG backend to Render.

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] GitHub repository with your code
- [ ] MongoDB Atlas cluster (free tier available)
- [ ] Upstash Redis account (free tier available)
- [ ] API Keys: OpenAI GPT, Google Gemini, Tavily
- [ ] Google OAuth credentials
- [ ] Render account (free tier available)

---

## 🔧 Step 1: Set Up External Services

### 1.1 MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (M0 Sandbox)
3. Create a database user with password
4. Whitelist all IPs: `0.0.0.0/0` (for Render access)
5. Get your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/FYP
   ```

### 1.2 Upstash Redis

1. Go to [Upstash](https://upstash.com/)
2. Create a free Redis database
3. Select a region close to your Render region (Oregon recommended)
4. Get your credentials:
   - **Host**: `xxx-xxx-xxxxx.upstash.io`
   - **Port**: `6379`
   - **Password**: Your Upstash password

### 1.3 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   ```
   https://your-app-name.onrender.com/api/auth/google/callback
   ```
6. Save your:
   - **Client ID**
   - **Client Secret**

---

## 🌐 Step 2: Deploy to Render

### 2.1 Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the repository containing your backend code
5. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `agentic-rag-backend` (or your choice) |
   | **Region** | Oregon (or closest to you) |
   | **Branch** | `main` |
   | **Root Directory** | `agentic-rag-backend` |
   | **Runtime** | Docker |
   | **Instance Type** | Free |

6. Click **"Create Web Service"**

### 2.2 Configure Environment Variables

In your Render service dashboard, go to **"Environment"** and add these variables:

#### Required Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/FYP

# Redis (Upstash)
REDIS_HOST=xxx-xxx-xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password

# API Keys
GPT_API_KEY=sk-...
GEMINI_API_KEY=...
TAVILY_API_KEY=...

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-app-name.onrender.com/api/auth/google/callback

# Frontend URL (will be your Vercel URL)
FRONTEND_URL=https://your-frontend.vercel.app

# Admin Configuration
ADMIN_EMAILS=admin@example.com,another@example.com

# Cache Settings
CACHE_TTL=3600
CACHE_ENABLED=true

# Queue Configuration
QUEUE_CONCURRENCY=3
QUEUE_MAX_JOBS=50
QUEUE_TIMEOUT=35000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Logging
LOG_LEVEL=info
PYTHON_PATH=python3
```

#### Generate Secure JWT Secret

Run this command locally to generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.3 Add Persistent Disk (Optional)

For persistent logs:

1. Go to **"Disks"** in your service
2. Click **"Add Disk"**
3. Configure:
   - **Name**: `logs`
   - **Mount Path**: `/app/logs`
   - **Size**: 1 GB
4. Save

---

## ✅ Step 3: Verify Deployment

### 3.1 Check Build Logs

1. Go to **"Logs"** tab in Render
2. Wait for build to complete (5-10 minutes first time)
3. Look for: `✓ Agentic RAG Backend Server Running`

### 3.2 Test Health Endpoint

Visit: `https://your-app-name.onrender.com/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-11T...",
  "services": {
    "database": "connected",
    "cache": "connected",
    "queue": "running"
  }
}
```

### 3.3 Test API Endpoints

```bash
# Test health
curl https://your-app-name.onrender.com/health

# Test stats (should require auth)
curl https://your-app-name.onrender.com/api/stats
```

---

## 🔄 Step 4: Update Frontend

Once backend is deployed, update your frontend environment variable:

```bash
VITE_API_BASE=https://your-app-name.onrender.com
```

---

## 🐛 Troubleshooting

### Build Fails

**Error**: `Python dependencies failed`
- **Solution**: Check `python_rag/requirements.txt` is present
- **Solution**: Verify Dockerfile copies Python requirements correctly

**Error**: `npm ci failed`
- **Solution**: Delete `package-lock.json` and regenerate
- **Solution**: Check Node version in Dockerfile matches local

### Runtime Errors

**Error**: `MongoDB connection failed`
- **Solution**: Verify connection string is correct
- **Solution**: Check IP whitelist includes `0.0.0.0/0`
- **Solution**: Verify database user has correct permissions

**Error**: `Redis connection failed`
- **Solution**: Verify Upstash credentials
- **Solution**: Check REDIS_HOST doesn't include `redis://` prefix
- **Solution**: Ensure REDIS_PASSWORD is set

**Error**: `Health check failing`
- **Solution**: Check logs for specific error
- **Solution**: Verify PORT is set to 3000
- **Solution**: Ensure all required env vars are set

### Performance Issues

**Issue**: Slow cold starts
- **Cause**: Free tier spins down after inactivity
- **Solution**: Upgrade to paid tier or use a ping service

**Issue**: Timeout errors
- **Cause**: Free tier has limited resources
- **Solution**: Optimize Python dependencies
- **Solution**: Reduce QUEUE_CONCURRENCY to 1-2

---

## 📊 Monitoring

### View Logs

```bash
# In Render Dashboard
1. Go to your service
2. Click "Logs" tab
3. Filter by level (info, error, etc.)
```

### Metrics

Render provides basic metrics:
- CPU usage
- Memory usage
- Request count
- Response times

Access via **"Metrics"** tab in dashboard.

---

## 🔒 Security Notes

### Current Implementation

✅ **Implemented**:
- Helmet.js security headers
- CORS configuration
- JWT authentication
- Input sanitization
- Rate limiting
- Non-root Docker user

⚠️ **Recommended Improvements** (for backend dev):
- Implement HTTP-only cookies instead of localStorage
- Add CSRF protection
- Implement token refresh mechanism
- Add request signing
- Implement API key rotation

See `SECURITY_ENHANCEMENTS.md` for detailed implementation guide.

---

## 🔗 Useful Links

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)

---

## 📝 Next Steps

1. ✅ Backend deployed on Render
2. ⏭️ Deploy frontend to Vercel (see `VERCEL_DEPLOYMENT.md`)
3. ⏭️ Configure custom domain (optional)
4. ⏭️ Set up monitoring and alerts
5. ⏭️ Implement security enhancements

---

**Need help?** Check the troubleshooting section or contact your backend developer.
