# Google OAuth Setup Guide

## 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top left and select **"New Project"**.
3. Name it "Student Chatbot" (or similar) and click **Create**.

## 2. Configure OAuth Consent Screen
1. In the left sidebar, navigate to **APIs & Services** > **OAuth consent screen**.
2. Select **External** (unless you have a Google Workspace organization) and click **Create**.
3. **App Information**:
   - App Name: `Student Chatbot`
   - User Support Email: Select your email.
4. **Developer Contact Information**: Enter your email.
5. Click **Save and Continue** through the "Scopes" and "Test Users" sections (you can leave defaults for now).
6. On the Summary page, click **Back to Dashboard**.

## 3. Create OAuth Credentials
1. In the left sidebar, go to **Credentials**.
2. Click **+ CREATE CREDENTIALS** (top) > **OAuth client ID**.
3. **Application Type**: Select **Web application**.
4. **Name**: `React Frontend`.
5. **Authorized JavaScript origins** (CRITICAL STEP):
   - Click **ADD URI**.
   - Enter: `http://localhost:5173`
   - *Note: This MUST match your frontend URL exactly.*
6. **Authorized redirect URIs**:
   - Click **ADD URI**.
   - Enter: `http://localhost:5173`
   - Enter: `http://localhost:5173/login`
7. Click **Create**.

## 4. Copy Your Client ID
A popup will appear with your "Client ID" and "Client Secret".
- Copy the **Client ID** (it looks like `12345...apps.googleusercontent.com`).
- *You do not need the Client Secret for the frontend, but keep it safe.*

## 5. Update Your Project Configuration

### Step 5a: Update Frontend
1. Open `c:\codes\FYP\agentic-rag-frontend\.env`
2. Update the `VITE_GOOGLE_CLIENT_ID` variable:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_copied_client_id_here
   ```

### Step 5b: Update Backend
1. Open `c:\codes\FYP\agentic-rag-backend\.env`
2. Update the `GOOGLE_CLIENT_ID` variable:
   ```env
   GOOGLE_CLIENT_ID=your_copied_client_id_here
   ```
3. (Optional) If you want to be an admin, add your Gmail to `ADMIN_EMAILS`:
   ```env
   ADMIN_EMAILS=your.email@gmail.com
   ```

## 6. Restart Servers
Changes to `.env` files require a server restart.
1. Go to your terminals.
2. Stop the running servers (Ctrl+C).
3. Run `npm run dev` in both backend and frontend folders again.

---
**Troubleshooting Error 401: invalid_client:**
- This usually means the "Authorized JavaScript origin" in Google Console does not **exactly** match the URL in your browser bar.
- Ensure you added `http://localhost:5173`.
- Clear your browser cache or try an Incognito window if it persists after fixing.
