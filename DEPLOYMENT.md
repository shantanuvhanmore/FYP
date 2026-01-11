# 🚀 Deployment Guide - Agentic RAG Chatbot

Complete deployment guide for deploying your Agentic RAG chatbot to production using **Render** (backend) and **Vercel** (frontend).

---

## 📚 Quick Navigation

- **Backend Deployment**: See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
- **Frontend Deployment**: See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **Security Enhancements**: See [SECURITY_ENHANCEMENTS.md](./SECURITY_ENHANCEMENTS.md)

---

## 🎯 Deployment Overview

### Architecture

```
┌─────────────────┐         ┌──────────────────┐
│                 │         │                  │
│  Vercel         │────────▶│  Render          │
│  (Frontend)     │  HTTPS  │  (Backend)       │
│  React + Vite   │         │  Node.js + Python│
│                 │         │                  │
└─────────────────┘         └──────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌──────────────┐ ┌──────────┐  ┌──────────────┐
            │  MongoDB     │ │ Upstash  │  │  External    │
            │  Atlas       │ │ Redis    │  │  APIs        │
            │  (Database)  │ │ (Cache)  │  │  (GPT, etc.) │
            └──────────────┘ └──────────┘  └──────────────┘
```

### Technology Stack

**Frontend (Vercel)**:
- React 18
- Vite 4
- React Router
- Google OAuth

**Backend (Render)**:
- Node.js 18
- Express
- Python 3 (RAG pipeline)
- Bull (Queue)

**Services**:
- MongoDB Atlas (Database)
- Upstash Redis (Cache & Queue)
- OpenAI GPT (LLM)
- Google Gemini (LLM)
- Tavily (Search)

---

## 🚦 Deployment Checklist

### Phase 1: Prerequisites

- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Sign up for required services:
  - [ ] MongoDB Atlas
  - [ ] Upstash Redis
  - [ ] Render
  - [ ] Vercel
- [ ] Obtain API keys:
  - [ ] OpenAI GPT API key
  - [ ] Google Gemini API key
  - [ ] Tavily API key
  - [ ] Google OAuth credentials

### Phase 2: Backend Deployment (Render)

- [ ] Set up MongoDB Atlas cluster
- [ ] Set up Upstash Redis
- [ ] Configure Google OAuth
- [ ] Deploy backend to Render
- [ ] Configure environment variables
- [ ] Verify health endpoint
- [ ] Test API endpoints

**Detailed Guide**: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

### Phase 3: Frontend Deployment (Vercel)

- [ ] Deploy frontend to Vercel
- [ ] Configure environment variables
- [ ] Update backend CORS settings
- [ ] Update Google OAuth settings
- [ ] Test frontend functionality
- [ ] Verify backend connection
- [ ] Test Google OAuth flow
- [ ] Test chat functionality

**Detailed Guide**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### Phase 4: Post-Deployment

- [ ] End-to-end testing
- [ ] Performance monitoring
- [ ] Set up error tracking
- [ ] Configure custom domains (optional)
- [ ] Review security enhancements

---

## ⚡ Quick Start (30 Minutes)

### 1. Backend (15 minutes)

```bash
# 1. Create MongoDB Atlas cluster (5 min)
# 2. Create Upstash Redis (2 min)
# 3. Deploy to Render (5 min)
# 4. Configure environment variables (3 min)
```

See: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

### 2. Frontend (10 minutes)

```bash
# 1. Deploy to Vercel (3 min)
# 2. Configure environment variables (2 min)
# 3. Update backend CORS (2 min)
# 4. Update Google OAuth (3 min)
```

See: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### 3. Verify (5 minutes)

```bash
# Test all functionality
1. Visit your Vercel URL
2. Test guest login
3. Test Google OAuth
4. Send test chat message
5. Check admin dashboard (if admin)
```

---

## 🔑 Environment Variables Reference

### Backend (Render)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | `production` | ✅ |
| `PORT` | Server port | `3000` | ✅ |
| `MONGODB_URI` | MongoDB connection | `mongodb+srv://...` | ✅ |
| `REDIS_HOST` | Upstash host | `xxx.upstash.io` | ✅ |
| `REDIS_PORT` | Redis port | `6379` | ✅ |
| `REDIS_PASSWORD` | Upstash password | `***` | ✅ |
| `GPT_API_KEY` | OpenAI API key | `sk-...` | ✅ |
| `GEMINI_API_KEY` | Google Gemini key | `***` | ✅ |
| `TAVILY_API_KEY` | Tavily API key | `***` | ✅ |
| `JWT_SECRET` | JWT signing key | `64-char-hex` | ✅ |
| `GOOGLE_CLIENT_ID` | OAuth client ID | `***.apps.googleusercontent.com` | ✅ |
| `GOOGLE_CLIENT_SECRET` | OAuth secret | `***` | ✅ |
| `FRONTEND_URL` | Vercel URL | `https://app.vercel.app` | ✅ |
| `ADMIN_EMAILS` | Admin emails | `admin@example.com` | ✅ |

### Frontend (Vercel)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE` | Backend URL | `https://app.onrender.com` | ✅ |
| `VITE_GOOGLE_CLIENT_ID` | OAuth client ID | `***.apps.googleusercontent.com` | ✅ |

---

## 🐛 Common Issues

### Backend Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check Dockerfile and dependencies |
| MongoDB connection fails | Verify connection string and IP whitelist |
| Redis connection fails | Check Upstash credentials |
| Health check fails | Review logs for specific errors |

### Frontend Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check `package.json` and imports |
| API calls fail | Verify `VITE_API_BASE` and CORS |
| OAuth fails | Check Google Console settings |
| 404 on refresh | Ensure `vercel.json` has rewrites |

**Detailed Troubleshooting**: See individual deployment guides.

---

## 📊 Cost Breakdown

### Free Tier (Recommended for Testing)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Render** | ✅ Free | 750 hours/month, sleeps after 15min inactivity |
| **Vercel** | ✅ Free | 100GB bandwidth, unlimited deployments |
| **MongoDB Atlas** | ✅ Free | 512MB storage, shared cluster |
| **Upstash Redis** | ✅ Free | 10,000 commands/day |

**Total Cost**: $0/month

### Production Tier (Recommended for Production)

| Service | Cost | Benefits |
|---------|------|----------|
| **Render** | $7/month | No sleep, better performance |
| **Vercel** | $20/month | Analytics, better support |
| **MongoDB Atlas** | $9/month | Dedicated cluster, backups |
| **Upstash Redis** | $10/month | Higher limits |

**Total Cost**: ~$46/month

---

## 🔒 Security Considerations

### Current Implementation

✅ **Implemented**:
- Helmet.js security headers
- CORS configuration
- JWT authentication
- Input sanitization
- Rate limiting
- HTTPS (automatic on Vercel/Render)

### Recommended Enhancements

For production deployment, consider implementing:

1. **HTTP-only Cookies** - More secure than localStorage
2. **CSRF Protection** - Prevent cross-site attacks
3. **Token Refresh** - Better session management
4. **API Rate Limiting** - Prevent abuse
5. **Request Signing** - Verify request authenticity

**Detailed Guide**: [SECURITY_ENHANCEMENTS.md](./SECURITY_ENHANCEMENTS.md)

---

## 📈 Monitoring & Maintenance

### Monitoring

**Render**:
- Built-in logs and metrics
- Health check monitoring
- Email alerts for downtime

**Vercel**:
- Analytics dashboard
- Performance insights
- Deployment notifications

### Maintenance Tasks

**Weekly**:
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Monitor API usage

**Monthly**:
- [ ] Review and rotate API keys
- [ ] Update dependencies
- [ ] Check for security updates

---

## 🎓 Learning Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Upstash Redis Docs](https://docs.upstash.com/redis)

---

## 🆘 Getting Help

### Documentation

1. Check deployment guides:
   - [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
   - [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

2. Review troubleshooting sections

3. Check service status pages:
   - [Render Status](https://status.render.com/)
   - [Vercel Status](https://www.vercel-status.com/)

### Support

- **Render**: [Support Portal](https://render.com/support)
- **Vercel**: [Help Center](https://vercel.com/help)
- **MongoDB**: [Support](https://www.mongodb.com/support)

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] Test all features end-to-end
- [ ] Verify Google OAuth works
- [ ] Test chat functionality
- [ ] Check admin dashboard
- [ ] Test rate limiting
- [ ] Verify error handling
- [ ] Check mobile responsiveness
- [ ] Set up monitoring alerts
- [ ] Document custom configurations
- [ ] Share URLs with team

---

## 🎉 Success!

Your Agentic RAG chatbot is now deployed and ready for use!

**URLs**:
- Frontend: `https://your-project.vercel.app`
- Backend: `https://your-app.onrender.com`
- Health: `https://your-app.onrender.com/health`

**Next Steps**:
1. Share with users
2. Monitor performance
3. Gather feedback
4. Implement security enhancements
5. Add new features

---

**Questions?** Refer to the detailed deployment guides or contact your backend developer.
