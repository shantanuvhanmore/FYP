# 🚀 Deployment Guide: Vercel (Frontend)

Complete guide for deploying the Agentic RAG frontend to Vercel.

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] GitHub repository with your code
- [ ] Backend deployed on Azure
- [ ] Backend URL (e.g., `https://fyp-agentic-rag-h0bzeqd9b0a3ewck.centralindia-01.azurewebsites.net`)
- [ ] Google OAuth Client ID
- [ ] Vercel account (free tier available)

---

## 🌐 Step 1: Deploy to Vercel

### 1.1 Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Select the repository containing your frontend code

### 1.2 Configure Project

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `agentic-rag-frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 1.3 Add Environment Variables

Click **"Environment Variables"** and add:

```bash
# Backend API URL (your Azure backend URL)
VITE_API_BASE=https://fyp-agentic-rag-h0bzeqd9b0a3ewck.centralindia-01.azurewebsites.net

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

> **Important**: Make sure to use your actual Azure backend URL!

### 1.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Your app will be live at: `https://your-project.vercel.app`

---

## ✅ Step 2: Update Backend CORS

After deployment, update your Azure backend environment variable:

1. Go to **Azure Portal** -> Your Web App
2. Select **Configuration** (under Settings)
3. Go to **Application settings** tab
4. Click **New application setting** (or edit existing `FRONTEND_URL`)
5. Update `FRONTEND_URL`:
   - Name: `FRONTEND_URL`
   - Value: `https://your-project.vercel.app`
6. Click **OK**, then **Save** at the top (this will restart the app)

---

## 🔄 Step 3: Update Google OAuth

Add your Vercel URL to Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **"Credentials"**
4. Edit your OAuth 2.0 Client ID
5. Add to **"Authorized JavaScript origins"**:
   ```
   https://your-project.vercel.app
   ```
6. Add to **"Authorized redirect URIs"**:
   ```
   https://your-project.vercel.app
   ```
7. Save

---

## ✅ Step 4: Verify Deployment

### 4.1 Test Frontend

1. Visit: `https://your-project.vercel.app`
2. Check that the page loads correctly
3. Verify all routes work:
   - `/` (Home)
   - `/chat` (Chat)
   - `/about` (About Us)
   - `/contact` (Contact)

### 4.2 Test Backend Connection

1. Open browser console (F12)
2. Try guest login
3. Check network tab for API calls
4. Verify calls go to your Azure backend

### 4.3 Test Google OAuth

1. Click "Sign in with Google"
2. Complete OAuth flow
3. Verify you're logged in
4. Check user profile displays correctly

### 4.4 Test Chat Functionality

1. Go to `/chat`
2. Send a test message
3. Verify response from backend
4. Check chat history saves

---

## 🔧 Configuration Details

### vercel.json Explained

The `vercel.json` file configures:

#### SPA Routing
```json
"rewrites": [
  { "source": "/(.*)", "destination": "/index.html" }
]
```
- Ensures all routes work with React Router
- Redirects all paths to index.html

#### Security Headers
```json
"headers": [
  {
    "key": "X-Content-Type-Options",
    "value": "nosniff"
  },
  ...
]
```
- Adds security headers to all responses
- Protects against common web vulnerabilities

#### Asset Caching
```json
{
  "source": "/assets/(.*)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "public, max-age=31536000, immutable"
    }
  ]
}
```
- Caches static assets for 1 year
- Improves performance

---

## 🐛 Troubleshooting

### Build Fails

**Error**: `Command "npm run build" exited with 1`
- **Solution**: Check build logs for specific error
- **Solution**: Verify `package.json` has build script
- **Solution**: Test build locally: `npm run build`

**Error**: `Module not found`
- **Solution**: Ensure all dependencies in `package.json`
- **Solution**: Delete `node_modules` and reinstall locally
- **Solution**: Check import paths are correct

### Runtime Errors

**Error**: `API calls failing / CORS error`
- **Solution**: Verify `VITE_API_BASE` is set correctly
- **Solution**: Check backend `FRONTEND_URL` matches Vercel URL
- **Solution**: Ensure backend CORS allows your domain

**Error**: `Google OAuth not working`
- **Solution**: Verify `VITE_GOOGLE_CLIENT_ID` is set
- **Solution**: Check Google Console has correct redirect URIs
- **Solution**: Ensure domain is authorized in Google Console

**Error**: `404 on page refresh`
- **Solution**: Verify `vercel.json` has rewrite rules
- **Solution**: Check `vercel.json` is in project root
- **Solution**: Redeploy after adding `vercel.json`

### Environment Variables Not Working

**Issue**: Changes not reflecting
- **Solution**: Redeploy after changing env vars
- **Solution**: Ensure env vars start with `VITE_`
- **Solution**: Check spelling and casing

---

## 🔄 Continuous Deployment

Vercel automatically deploys when you push to GitHub:

### Production Deployments
- Push to `main` branch → Production deployment
- URL: `https://your-project.vercel.app`

### Preview Deployments
- Push to any other branch → Preview deployment
- URL: `https://your-project-git-branch.vercel.app`
- Pull requests get automatic preview URLs

### Rollback
1. Go to Vercel Dashboard
2. Select your project
3. Go to **"Deployments"**
4. Find previous deployment
5. Click **"..."** → **"Promote to Production"**

---

## 🎨 Custom Domain (Optional)

### Add Custom Domain

1. Go to Vercel Dashboard
2. Select your project
3. Go to **"Settings"** → **"Domains"**
4. Click **"Add"**
5. Enter your domain (e.g., `chatbot.yourdomain.com`)
6. Follow DNS configuration instructions

### Update Configurations

After adding custom domain, update:

1. **Backend** `FRONTEND_URL`:
   ```bash
   FRONTEND_URL=https://chatbot.yourdomain.com
   ```

2. **Google OAuth** authorized origins:
   ```
   https://chatbot.yourdomain.com
   ```

---

## 📊 Monitoring

### Analytics

Vercel provides built-in analytics:
- Page views
- Top pages
- Visitor insights
- Performance metrics

Access via **"Analytics"** tab in dashboard.

### Performance

Check **"Speed Insights"** for:
- Core Web Vitals
- Performance scores
- Optimization suggestions

---

## 🔒 Security Best Practices

### Environment Variables

✅ **Do**:
- Use `VITE_` prefix for public variables
- Store sensitive keys in backend only
- Rotate API keys regularly

❌ **Don't**:
- Commit `.env` files to Git
- Expose backend secrets in frontend
- Use same keys for dev and production

### HTTPS

- Vercel provides automatic HTTPS
- All traffic is encrypted
- SSL certificates auto-renewed

---

## 🚀 Performance Optimization

### Build Optimization

Already configured in `vite.config.js`:
- Code splitting
- Tree shaking
- Minification
- Asset optimization

### Additional Tips

1. **Lazy Loading**:
   ```javascript
   const ChatPage = lazy(() => import('./pages/ChatPage'));
   ```

2. **Image Optimization**:
   - Use WebP format
   - Compress images
   - Use appropriate sizes

3. **Code Splitting**:
   - Already handled by Vite
   - Routes automatically split

---

## 📝 Next Steps

1. ✅ Frontend deployed on Vercel
2. ✅ Backend CORS updated
3. ✅ Google OAuth configured
4. ⏭️ Test end-to-end functionality
5. ⏭️ Set up custom domain (optional)
6. ⏭️ Configure monitoring and alerts

---

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)

---

**Deployment Complete!** 🎉

Your Agentic RAG chatbot is now live:
- **Frontend**: `https://your-project.vercel.app`
- **Backend**: `https://fyp-agentic-rag-h0bzeqd9b0a3ewck.centralindia-01.azurewebsites.net`

Test all features and enjoy your deployed application!
