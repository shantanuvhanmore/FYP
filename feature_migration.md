# Feature Migration Guide: EDIT-CHATBOT

This comprehensive guide documents all features implemented in the EDIT-CHATBOT project, providing detailed implementation instructions for migrating these features to other chatbot projects.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Authentication System](#authentication-system)
3. [Chat Memory & Session Management](#chat-memory--session-management)
4. [Conversation Management (Saved Chats)](#conversation-management-saved-chats)
5. [Like/Dislike Feedback System](#likedislike-feedback-system)
6. [Admin Dashboard](#admin-dashboard)
7. [Token Usage Limiting](#token-usage-limiting)
8. [Database Setup (MongoDB)](#database-setup-mongodb)
9. [Frontend Architecture](#frontend-architecture)
10. [API Routes Reference](#api-routes-reference)

---

## Project Overview

**Tech Stack:**
- **Frontend**: React 19 + Vite, React Router DOM, Google OAuth
- **Backend**: Node.js + Express
- **Database**: MongoDB (with Mongoose ODM)
- **AI**: OpenAI API (GPT-4o-mini)
- **Authentication**: JWT + Google OAuth 2.0

**Key Features:**
- ✅ Google OAuth & Guest Sign-in
- ✅ Chat memory with conversation history
- ✅ Saved conversations (persistent storage)
- ✅ Like/Dislike feedback on messages
- ✅ Admin dashboard with filtering
- ✅ Token usage limiting (2000 tokens per session)
- ✅ Session-based rate limiting

---

## 1. Authentication System

### 1.1 Google OAuth Setup

#### **Backend Configuration**

**Step 1: Install Required Packages**
```bash
npm install google-auth-library jsonwebtoken
```

**Step 2: Environment Variables**
Create `.env` file in server directory:
```env
GOOGLE_CLIENT_ID=your_google_client_id_here
JWT_SECRET=your_jwt_secret_key_here
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

**Step 3: Get Google OAuth Credentials**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: Web application
6. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - Your production domain
7. Add authorized redirect URIs (if needed)
8. Copy the **Client ID**

#### **Backend Authentication Routes**

**File: `server/src/routes/auth.js`**

```javascript
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth login
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;
        
        // Check if email is in admin whitelist
        const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
        const isAdmin = ADMIN_EMAILS.includes(email);
        const role = isAdmin ? 'admin' : 'user';
        
        // Find or create user
        let user = await User.findOne({ googleId });
        
        if (user) {
            // Update existing user
            user.email = email;
            user.name = name;
            user.profilePicture = picture;
            user.role = role;
            user.isAdmin = isAdmin;
            await user.save();
        } else {
            // Create new user
            user = await User.create({
                googleId,
                email,
                name,
                profilePicture: picture,
                role,
                isAdmin
            });
        }
        
        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            user: {
                id: user._id,
                googleId: user.googleId,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture,
                role: user.role,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Guest login (for development/testing)
router.post('/guest', async (req, res) => {
    try {
        const guestEmail = 'guest@yourapp.local';
        const guestName = 'Guest User';
        
        let user = await User.findOne({ email: guestEmail });
        
        if (!user) {
            user = await User.create({
                googleId: 'guest_' + Date.now(),
                email: guestEmail,
                name: guestName,
                profilePicture: 'https://ui-avatars.com/api/?name=Guest&background=00fff5&color=0f0c29&size=128',
                role: 'user',
                isAdmin: false
            });
        }
        
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            user: {
                id: user._id,
                googleId: user.googleId,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture,
                role: user.role,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Guest auth error:', error);
        res.status(500).json({ error: 'Guest authentication failed' });
    }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                googleId: req.user.googleId,
                email: req.user.email,
                name: req.user.name,
                profilePicture: req.user.profilePicture,
                role: req.user.role,
                isAdmin: req.user.isAdmin
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

export default router;
```

#### **Backend Middleware**

**File: `server/src/middleware/auth.js`**

```javascript
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verify JWT token and attach user to request
export const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch user from database
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Require admin role
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
};
```

#### **Frontend Setup**

**Step 1: Install Packages**
```bash
npm install @react-oauth/google react-router-dom
```

**Step 2: Setup Google OAuth Provider in Main.jsx**

**File: `client/src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './index.css';

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
```

**Step 3: Create Auth Context**

**File: `client/src/contexts/AuthContext.jsx`**

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    const [loading, setLoading] = useState(true);
    
    const API_BASE = 'http://localhost:3000'; // Change for production
    
    // Load user on mount if token exists
    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);
    
    const fetchUser = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };
    
    const login = async (googleCredential) => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: googleCredential })
            });
            
            if (res.ok) {
                const data = await res.json();
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem('auth_token', data.token);
                return { success: true };
            } else {
                const error = await res.json();
                return { success: false, error: error.error };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Login failed' };
        }
    };
    
    const loginAsGuest = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (res.ok) {
                const data = await res.json();
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem('auth_token', data.token);
                return { success: true };
            } else {
                const error = await res.json();
                return { success: false, error: error.error };
            }
        } catch (error) {
            console.error('Guest login error:', error);
            return { success: false, error: 'Guest login failed' };
        }
    };
    
    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
    };
    
    const value = {
        user,
        token,
        loading,
        login,
        loginAsGuest,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.isAdmin || false
    };
    
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

**Step 4: Google Login Button Component**

**File: `client/src/components/GoogleLoginButton.jsx`**

```jsx
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function GoogleLoginButton() {
    const { user, login, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    
    const handleSuccess = async (credentialResponse) => {
        const result = await login(credentialResponse.credential);
        if (result.success) {
            navigate('/');
        } else {
            alert('Login failed: ' + result.error);
        }
    };
    
    const handleError = () => {
        console.error('Google login failed');
        alert('Google login failed');
    };
    
    if (isAuthenticated) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={user.profilePicture} alt={user.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                <span>{user.name}</span>
                {user.isAdmin && <span style={{ color: '#00fff5' }}>Admin</span>}
                <button onClick={logout}>Logout</button>
            </div>
        );
    }
    
    return (
        <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            theme="filled_blue"
            size="large"
        />
    );
}
```

---

## 2. Chat Memory & Session Management

### 2.1 Implementation Details

The chat memory is implemented using **in-memory session storage** on the server with conversation history.

**File: `server/src/index.js`**

```javascript
// In-memory session store
// { [sessionId]: { history: [], tokensUsed: 0, lastAccess: Date } }
global.sessions = {};

app.post('/chat', async (req, res) => {
    const { session_id, message } = req.body;
    
    // Create or retrieve session
    const validSessionId = session_id || uuidv4();
    if (!global.sessions[validSessionId]) {
        global.sessions[validSessionId] = {
            history: [],
            tokensUsed: 0,
            lastAccess: new Date()
        };
    }
    
    const session = global.sessions[validSessionId];
    session.lastAccess = new Date();
    
    // Process chat...
});
```

**File: `server/src/openai.js`**

```javascript
const HISTORY_WINDOW_SIZE = 5; // Keep last 5 message pairs

export async function handleChat(sessionId, userMessage) {
    const session = global.sessions[sessionId];
    
    // 1. Prepare messages with history
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    const historyToSend = session.history.slice(-HISTORY_WINDOW_SIZE);
    messages.push(...historyToSend);
    messages.push({ role: 'user', content: userMessage });
    
    // 2. Call OpenAI
    const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: messages,
        max_tokens: MAX_RESPONSE_TOKENS,
        temperature: 0.8,
    });
    
    const reply = completion.choices[0].message.content;
    const usage = completion.usage;
    
    // 3. Update Session with new messages
    session.tokensUsed += usage.total_tokens;
    session.history.push({ role: 'user', content: userMessage });
    session.history.push({ role: 'assistant', content: reply });
    
    return {
        reply,
        tokens_used: session.tokensUsed,
        total_tokens: TOKEN_LIMIT_SESSION,
        session_exhausted: session.tokensUsed >= TOKEN_LIMIT_SESSION
    };
}
```

**Frontend Session Management:**

```javascript
// Store session ID in localStorage
const sessionId = localStorage.getItem('chat_session_id');
if (!sessionId) {
    localStorage.setItem('chat_session_id', newSessionId);
}
```

---

## 3. Conversation Management (Saved Chats)

### 3.1 Database Schema

**File: `server/src/models/Conversation.js`**

```javascript
import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Conversation', ConversationSchema);
```

**File: `server/src/models/Message.js`**

```javascript
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    sender: {
        type: String,
        enum: ['user', 'bot'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    feedback: {
        type: String,
        enum: ['none', 'liked', 'disliked'],
        default: 'none'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Message', MessageSchema);
```

### 3.2 API Routes

**File: `server/src/routes/conversations.js`**

```javascript
import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const router = express.Router();

// Create a new conversation
router.post('/', async (req, res) => {
    try {
        const { userId, title } = req.body;
        const conversation = await Conversation.create({ userId, title });
        res.status(201).json(conversation);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all conversations for a user
router.get('/:userId', async (req, res) => {
    try {
        const conversations = await Conversation
            .find({ userId: req.params.userId })
            .sort({ createdAt: -1 });
        res.json(conversations);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a conversation and all its messages
router.delete('/:id', async (req, res) => {
    try {
        const conversationId = req.params.id;
        await Message.deleteMany({ conversationId });
        const conversation = await Conversation.findByIdAndDelete(conversationId);
        
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        
        res.json({ message: 'Conversation deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
```

**File: `server/src/routes/messages.js`**

```javascript
// Save a new message
router.post('/', async (req, res) => {
    try {
        const { conversationId, sender, content } = req.body;
        const message = await Message.create({ conversationId, sender, content });
        res.status(201).json(message);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all messages for a conversation
router.get('/:conversationId', async (req, res) => {
    try {
        const messages = await Message
            .find({ conversationId: req.params.conversationId })
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
```

### 3.3 Frontend Implementation

**File: `client/src/hooks/useChat.js`**

```javascript
// Create a new conversation
const createConversation = async (title) => {
    try {
        const res = await fetch(`${API_BASE}/api/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, title })
        });
        
        if (res.ok) {
            const newConversation = await res.json();
            setConversations(prev => [newConversation, ...prev]);
            setCurrentConversationId(newConversation._id);
            return newConversation._id;
        }
    } catch (error) {
        console.error('Error creating conversation:', error);
    }
    return null;
};

// Select a conversation and load its messages
const selectConversation = async (conversationId) => {
    try {
        const res = await fetch(`${API_BASE}/api/messages/${conversationId}`);
        if (res.ok) {
            const messagesData = await res.json();
            const chatMessages = messagesData.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
            setMessages(chatMessages);
            setCurrentConversationId(conversationId);
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
    }
};

// Save a message to the database
const saveMessage = async (conversationId, sender, content) => {
    try {
        const res = await fetch(`${API_BASE}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId, sender, content })
        });
        
        if (res.ok) {
            const savedMessage = await res.json();
            return savedMessage;
        }
    } catch (error) {
        console.error('Error saving message:', error);
    }
    return null;
};
```

---

## 4. Like/Dislike Feedback System

### 4.1 Backend Implementation

**File: `server/src/routes/messages.js`**

```javascript
// Update message feedback
router.patch('/:id/feedback', async (req, res) => {
    try {
        const { feedback } = req.body;
        
        if (!feedback || !['none', 'liked', 'disliked'].includes(feedback)) {
            return res.status(400).json({
                error: 'feedback must be "none", "liked", or "disliked"'
            });
        }
        
        const message = await Message.findByIdAndUpdate(
            req.params.id,
            { feedback },
            { new: true }
        );
        
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        res.json(message);
    } catch (err) {
        console.error('Error updating feedback:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
```

### 4.2 Frontend Implementation

```javascript
// Update message feedback (like/dislike)
const updateFeedback = async (messageId, feedback) => {
    try {
        const res = await fetch(`${API_BASE}/api/messages/${messageId}/feedback`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback })
        });
        
        if (res.ok) {
            // Update local message state
            setMessages(prev => prev.map(msg =>
                msg._id === messageId ? { ...msg, feedback } : msg
            ));
        }
    } catch (error) {
        console.error('Error updating feedback:', error);
    }
};
```

**UI Component Example:**

```jsx
<div>
    <button onClick={() => updateFeedback(message._id, 'liked')}>
        👍 Like
    </button>
    <button onClick={() => updateFeedback(message._id, 'disliked')}>
        👎 Dislike
    </button>
</div>
```

---

## 5. Admin Dashboard

### 5.1 Backend Routes

**File: `server/src/routes/admin.js`**

```javascript
import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(verifyToken);
router.use(requireAdmin);

// Get all conversations with aggregated stats
router.get('/conversations', async (req, res) => {
    try {
        const conversations = await Conversation.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $lookup: {
                    from: 'messages',
                    localField: '_id',
                    foreignField: 'conversationId',
                    as: 'messages'
                }
            },
            {
                $addFields: {
                    totalMessages: { $size: '$messages' },
                    likedCount: {
                        $size: {
                            $filter: {
                                input: '$messages',
                                cond: { $eq: ['$$this.feedback', 'liked'] }
                            }
                        }
                    },
                    dislikedCount: {
                        $size: {
                            $filter: {
                                input: '$messages',
                                cond: { $eq: ['$$this.feedback', 'disliked'] }
                            }
                        }
                    }
                }
            },
            { $project: { messages: 0 } },
            { $sort: { createdAt: -1 } }
        ]);
        
        res.json(conversations);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get filtered and paginated messages
router.get('/messages', async (req, res) => {
    try {
        const { filter = 'all', page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build filter query
        let feedbackFilter = {};
        if (filter === 'liked') {
            feedbackFilter = { feedback: 'liked' };
        } else if (filter === 'disliked') {
            feedbackFilter = { feedback: 'disliked' };
        }
        
        // Get messages with conversation and user info
        const messages = await Message.aggregate([
            { $match: feedbackFilter },
            {
                $lookup: {
                    from: 'conversations',
                    localField: 'conversationId',
                    foreignField: '_id',
                    as: 'conversation'
                }
            },
            { $unwind: '$conversation' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'conversation.userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    sender: 1,
                    feedback: 1,
                    createdAt: 1,
                    'conversation.title': 1,
                    'user.email': 1,
                    'user.name': 1
                }
            }
        ]);
        
        const totalCount = await Message.countDocuments(feedbackFilter);
        
        res.json({
            messages,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                limit: parseInt(limit)
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
```

### 5.2 Frontend Dashboard Component

**File: `client/src/components/AdminDashboard.jsx`**

Key features:
- **Tabbed Interface**: Switch between "Conversations" and "Messages" views
- **Filtering**: Filter messages by feedback (all/liked/disliked)
- **Pagination**: Navigate through large datasets
- **Time Display**: Show creation dates for all records
- **Aggregated Stats**: Display total messages, likes, and dislikes per conversation

```jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('conversations');
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [filter, setFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    
    const API_BASE = 'http://localhost:3000';
    
    useEffect(() => {
        if (activeTab === 'conversations') {
            fetchConversations();
        } else {
            fetchMessages();
        }
    }, [activeTab, filter, currentPage]);
    
    const fetchConversations = async () => {
        const res = await fetch(`${API_BASE}/api/admin/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setConversations(data);
        }
    };
    
    const fetchMessages = async () => {
        const res = await fetch(
            `${API_BASE}/api/admin/messages?filter=${filter}&page=${currentPage}&limit=20`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (res.ok) {
            const data = await res.json();
            setMessages(data.messages);
            setPagination(data.pagination);
        }
    };
    
    // Render UI...
}
```

---

## 6. Token Usage Limiting

### 6.1 Server-Side Implementation

**Configuration in `server/src/openai.js`:**

```javascript
const TOKEN_LIMIT_SESSION = 2000; // Maximum tokens per session
const MAX_RESPONSE_TOKENS = 300;  // Maximum tokens per response

export async function handleChat(sessionId, userMessage) {
    const session = global.sessions[sessionId];
    
    // Call OpenAI...
    const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: messages,
        max_tokens: MAX_RESPONSE_TOKENS,
        temperature: 0.8,
    });
    
    // Track token usage
    session.tokensUsed += completion.usage.total_tokens;
    
    return {
        reply,
        tokens_used: session.tokensUsed,
        total_tokens: TOKEN_LIMIT_SESSION,
        session_exhausted: session.tokensUsed >= TOKEN_LIMIT_SESSION
    };
}
```

**Limit Enforcement in `server/src/index.js`:**

```javascript
app.post('/chat', async (req, res) => {
    const session = global.sessions[validSessionId];
    
    // Check limits BEFORE processing
    if (session.tokensUsed >= 2000) {
        return res.status(403).json({
            error: "SESSION_LIMIT_REACHED",
            message: "Session token limit reached. Please reset after 24 hours.",
            session_exhausted: true,
            tokens_used: session.tokensUsed,
            total_tokens: 2000
        });
    }
    
    // Process chat if limit not reached...
});
```

### 6.2 Frontend Display

```jsx
// Display token usage
<div>
    <p>Tokens Used: {tokensUsed} / {totalTokens}</p>
    <div style={{ width: '100%', background: '#ddd', borderRadius: '8px' }}>
        <div style={{
            width: `${(tokensUsed / totalTokens) * 100}%`,
            background: isSessionExhausted ? 'red' : '#00fff5',
            height: '8px',
            borderRadius: '8px'
        }} />
    </div>
</div>
```

---

## 7. Database Setup (MongoDB)

### 7.1 MongoDB Connection

**File: `server/src/config/db.js`**

```javascript
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'YOUR_DATABASE_NAME'
        });
        
        console.log('✅ MongoDB connected successfully');
        console.log('📊 Database:', mongoose.connection.db.databaseName);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
};

export default connectDB;
```

### 7.2 Environment Setup

**`.env` file:**
```env
MONGO_URI=mongodb://localhost:27017/your_database_name
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

### 7.3 Database Models Summary

**Three main collections:**

1. **Users** (`server/src/models/User.js`)
   - `googleId` (String, unique, indexed)
   - `email` (String, unique, indexed)
   - `name` (String)
   - `profilePicture` (String)
   - `role` (String: 'user' | 'admin')
   - `isAdmin` (Boolean)
   - `createdAt` (Date)

2. **Conversations** (`server/src/models/Conversation.js`)
   - `userId` (ObjectId, ref: 'User', indexed)
   - `title` (String)
   - `createdAt` (Date)

3. **Messages** (`server/src/models/Message.js`)
   - `conversationId` (ObjectId, ref: 'Conversation', indexed)
   - `sender` (String: 'user' | 'bot')
   - `content` (String)
   - `feedback` (String: 'none' | 'liked' | 'disliked')
   - `createdAt` (Date)

### 7.4 Indexes

Important indexes for performance:
```javascript
// User model
{ googleId: 1 }  // Unique
{ email: 1 }     // Unique

// Conversation model
{ userId: 1 }    // Query conversations by user

// Message model
{ conversationId: 1 }  // Query messages by conversation
```

---

## 8. Frontend Architecture

### 8.1 Folder Structure

```
client/
├── src/
│   ├── components/
│   │   ├── AdminDashboard.jsx
│   │   ├── GoogleLoginButton.jsx
│   │   ├── LandingPage.jsx
│   │   ├── MessageList.jsx
│   │   ├── InputArea.jsx
│   │   ├── Sidebar.jsx
│   │   └── ProtectedRoute.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   └── useChat.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── package.json
```

### 8.2 Protected Routes

**File: `client/src/components/ProtectedRoute.jsx`**

```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    
    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" />;
    }
    
    return children;
}
```

**Usage in App.jsx:**

```jsx
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './components/AdminDashboard';

function App() {
    return (
        <Routes>
            <Route path="/login" element={<LandingPage />} />
            <Route path="/" element={
                <ProtectedRoute>
                    <ChatInterface />
                </ProtectedRoute>
            } />
            <Route path="/admin" element={
                <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                </ProtectedRoute>
            } />
        </Routes>
    );
}
```

---

## 9. API Routes Reference

### Authentication Routes
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/guest` - Guest login
- `GET /api/auth/me` - Get current user (requires token)

### Conversation Routes
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:userId` - Get all conversations for user
- `DELETE /api/conversations/:id` - Delete conversation

### Message Routes
- `POST /api/messages` - Save new message
- `GET /api/messages/:conversationId` - Get all messages in conversation
- `PATCH /api/messages/:id/feedback` - Update message feedback

### Admin Routes (require admin token)
- `GET /api/admin/conversations` - Get all conversations with stats
- `GET /api/admin/messages?filter=all&page=1&limit=20` - Get filtered messages

### Chat Route
- `POST /chat` - Send message to AI (with session management and token limiting)

---

## 10. Environment Variables Summary

### Server `.env`:
```env
# Database
MONGO_URI=mongodb://localhost:27017/your_database_name

# Authentication
GOOGLE_CLIENT_ID=your_google_client_id_here
JWT_SECRET=your_jwt_secret_here
ADMIN_EMAILS=admin1@example.com,admin2@example.com

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Server
PORT=3000
```

### Client `.env`:
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_API_BASE=http://localhost:3000
```

---

## Additional Notes

### Adapting for Request-Based Limiting (10 requests/24hr)

To implement a **request-based limit** instead of token-based:

1. **Modify User Model** - Add request tracking:
```javascript
requestCount: { type: Number, default: 0 },
lastRequestReset: { type: Date, default: Date.now }
```

2. **Create Middleware**:
```javascript
const checkRequestLimit = async (req, res, next) => {
    const user = req.user;
    const now = new Date();
    const hoursSinceReset = (now - user.lastRequestReset) / (1000 * 60 * 60);
    
    // Reset if 24 hours passed
    if (hoursSinceReset >= 24) {
        user.requestCount = 0;
        user.lastRequestReset = now;
        await user.save();
    }
    
    // Check limit
    if (user.requestCount >= 10) {
        return res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'You have exceeded your daily request limit of 10 requests.'
        });
    }
    
    user.requestCount += 1;
    await user.save();
    next();
};
```

3. **Apply to chat route**: `app.post('/chat', verifyToken, checkRequestLimit, async (req, res) => { ... });`

### Admin Toggleable Limits

To allow admins to toggle between request limit and token limit:

1. **Add to User Model**:
```javascript
limitType: { type: String, enum: ['tokens', 'requests'], default: 'tokens' },
tokenLimit: { type: Number, default: 2000 },
requestLimit: { type: Number, default: 10 }
```

2. **Create Admin Route to Update Limits**:
```javascript
router.patch('/users/:id/limits', verifyToken, requireAdmin, async (req, res) => {
    const { limitType, tokenLimit, requestLimit } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, {
        limitType,
        tokenLimit,
        requestLimit
    }, { new: true });
    res.json(user);
});
```

---

## Conclusion

This guide provides comprehensive implementation details for all features in the EDIT-CHATBOT project. When migrating to your FYP chatbot:

1. Start with **Database Setup** (MongoDB schemas)
2. Implement **Authentication** (Google OAuth + Guest)
3. Add **Chat Memory** (session management)
4. Implement **Saved Chats** (conversations & messages)
5. Add **Feedback System** (like/dislike)
6. Build **Admin Dashboard** (with filtering)
7. Implement **Rate Limiting** (tokens or requests)

Each section provides working code that you can adapt to your project's specific needs. Good luck with your migration! 🚀
