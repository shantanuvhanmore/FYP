# ⚡ Quick Deployment Reference

**30-Minute Deployment Guide** for Agentic RAG Chatbot

---

## 🎯 Prerequisites (5 min)

Create accounts:
- ✅ [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Free tier
- ✅ [Upstash Redis](https://upstash.com/) - Free tier  
- ✅ [Render](https://render.com/) - Free tier
- ✅ [Vercel](https://vercel.com/) - Free tier

Get API keys:
- ✅ OpenAI GPT API key
- ✅ Google Gemini API key
- ✅ Tavily API key
- ✅ Google OAuth credentials

---

## 🚀 Backend Deployment (15 min)

### 1. MongoDB Atlas (3 min)
```
1. Create cluster → M0 Free
2. Create database user
3. Network Access → Add IP: 0.0.0.0/0
4. Copy connection string
```

### 2. Upstash Redis (2 min)
```
1. Create database
2. Copy: Host, Port, Password
```

### 3. Deploy to Render (10 min)
```
1. New Web Service → Connect GitHub
2. Select repo → agentic-rag-backend
3. Runtime: Docker
4. Add environment variables (see below)
5. Deploy
```

**Environment Variables**:
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=***
GPT_API_KEY=sk-...
GEMINI_API_KEY=***
TAVILY_API_KEY=***
JWT_SECRET=<generate-64-char-hex>
GOOGLE_CLIENT_ID=***.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=***
FRONTEND_URL=<will-update-later>
ADMIN_EMAILS=your@email.com
```

**Generate JWT Secret**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🎨 Frontend Deployment (10 min)

### 1. Deploy to Vercel (5 min)
```
1. New Project → Import from GitHub
2. Select repo → agentic-rag-frontend
3. Framework: Vite
4. Add environment variables:
   VITE_API_BASE=https://your-app.onrender.com
   VITE_GOOGLE_CLIENT_ID=***.apps.googleusercontent.com
5. Deploy
```

### 2. Update Backend CORS (2 min)
```
1. Go to Render → Your service → Environment
2. Update: FRONTEND_URL=https://your-project.vercel.app
3. Save (triggers redeploy)
```

### 3. Update Google OAuth (3 min)
```
1. Google Cloud Console → Credentials
2. Edit OAuth Client
3. Add authorized origins:
   https://your-project.vercel.app
4. Add redirect URIs:
   https://your-project.vercel.app
   https://your-app.onrender.com/api/auth/google/callback
5. Save
```

---

## ✅ Verification (5 min)

### Test Backend
```bash
curl https://your-app.onrender.com/health
# Should return: {"status":"healthy",...}
```

### Test Frontend
```
1. Visit: https://your-project.vercel.app
2. Click "Continue as Guest"
3. Send a test message
4. Verify response
```

### Test Google OAuth
```
1. Click "Sign in with Google"
2. Complete OAuth flow
3. Verify logged in
```

---

## 📋 Environment Variables Checklist

### Backend (Render)
- [ ] NODE_ENV
- [ ] PORT
- [ ] MONGODB_URI
- [ ] REDIS_HOST
- [ ] REDIS_PORT
- [ ] REDIS_PASSWORD
- [ ] GPT_API_KEY
- [ ] GEMINI_API_KEY
- [ ] TAVILY_API_KEY
- [ ] JWT_SECRET
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET
- [ ] GOOGLE_CALLBACK_URL
- [ ] FRONTEND_URL
- [ ] ADMIN_EMAILS

### Frontend (Vercel)
- [ ] VITE_API_BASE
- [ ] VITE_GOOGLE_CLIENT_ID

---

## 🐛 Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend build fails | Check Dockerfile, verify dependencies |
| MongoDB connection fails | Check connection string, IP whitelist |
| Redis connection fails | Verify Upstash credentials |
| Frontend API calls fail | Check VITE_API_BASE, verify CORS |
| OAuth fails | Check Google Console redirect URIs |
| 404 on page refresh | Ensure vercel.json exists |

---

## 📚 Full Documentation

For detailed guides, see:
- **Main Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Backend**: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
- **Frontend**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **Security**: [SECURITY_ENHANCEMENTS.md](./SECURITY_ENHANCEMENTS.md)

---

## 🎉 Done!

Your app is live:
- **Frontend**: https://your-project.vercel.app
- **Backend**: https://your-app.onrender.com
- **Health**: https://your-app.onrender.com/health

**Next**: Review [SECURITY_ENHANCEMENTS.md](./SECURITY_ENHANCEMENTS.md) for production hardening.
