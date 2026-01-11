# 🚀 Quick Start Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Python 3.8+ installed
- [ ] MongoDB connection string ready
- [ ] API keys ready (GPT/Gemini, Tavily)
- [ ] Redis installed (optional, has fallback)

## Step-by-Step Setup

### 1. Configure Environment

Edit `.env` file with your credentials:

```bash
# Required
MONGODB_URI=mongodb+srv://your-connection-string
GPT_API_KEY=sk-your-openai-key
# OR
GEMINI_API_KEY=your-gemini-key

# Optional
TAVILY_API_KEY=your-tavily-key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 2. Install Python Dependencies

```bash
npm run python:install
```

Or manually:
```bash
pip install -r python_rag/requirements.txt
```

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 4. Test the API

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Send a Chat Query:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the admission requirements?"}'
```

## Expected Response

```json
{
  "success": true,
  "data": {
    "answer": "The admission requirements are...",
    "contexts": ["Context 1", "Context 2"],
    "cached": false,
    "elapsed": "2500ms"
  },
  "requestId": "uuid-here"
}
```

## Troubleshooting

### MongoDB Connection Failed
- Check `MONGODB_URI` in `.env`
- Ensure MongoDB is accessible from your network
- Verify credentials

### Python Execution Error
- Ensure Python dependencies are installed
- Check `PYTHON_PATH` in `.env` (default: `python3`)
- Verify Python files are in `python_rag/` folder

### Redis Connection Failed
- App will run without Redis (in-memory cache fallback)
- To use Redis: Install and start Redis server
- Update `REDIS_HOST` and `REDIS_PORT` in `.env`

### Port Already in Use
- Change `PORT` in `.env` to a different port
- Or stop the process using port 3000

## Next Steps

### For Development
1. Check logs in `logs/` folder
2. Monitor queue: `http://localhost:3000/api/queue/status`
3. View stats: `http://localhost:3000/api/stats`

### For Production
1. Set `NODE_ENV=production` in `.env`
2. Use Docker: `docker-compose up -d`
3. Configure reverse proxy (nginx/Apache)
4. Set up SSL certificate
5. Configure monitoring (PM2, New Relic, etc.)

### Adding Features

#### Google OAuth (Future)
1. Get Google OAuth credentials
2. Add to `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
3. Implement auth routes in `src/routes/auth.routes.js`
4. Update middleware in `src/middleware/auth.middleware.js`

#### Admin Dashboard (Future)
1. Create frontend dashboard
2. Implement admin routes (already prepared)
3. Add admin users to database
4. Enable analytics tracking

#### Chat History (Future)
1. Enable conversation saving in `chat.controller.js`
2. Implement history endpoints
3. Add pagination UI in frontend

## API Endpoints Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/chat` | Process chat query | Public |
| GET | `/health` | System health | Public |
| GET | `/api/stats` | System statistics | Public |
| GET | `/api/queue/status` | Queue stats | Public |
| GET | `/api/cache/stats` | Cache stats | Public |
| GET | `/api/chat/history` | Chat history | Future (Auth) |
| POST | `/api/chat/save` | Save conversation | Future (Auth) |
| POST | `/api/admin/cache/clear` | Clear cache | Future (Admin) |
| GET | `/api/admin/analytics` | Analytics | Future (Admin) |

## Performance Tips

1. **Enable Redis** for better caching performance
2. **Adjust Queue Concurrency** in `.env` based on your server capacity
3. **Monitor Memory Usage** with `/api/stats`
4. **Set Appropriate Cache TTL** (default: 3600 seconds)
5. **Use Rate Limiting** to prevent abuse (already configured)

## Support

- Check `README.md` for detailed documentation
- Review logs in `logs/` folder
- Open GitHub issue for bugs
