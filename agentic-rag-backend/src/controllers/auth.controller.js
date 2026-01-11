import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import env from '../config/environment.js';
import { AuthenticationError } from '../utils/errors.js';

const client = new OAuth2Client(env.googleClientId);

/**
 * Authentication Controller
 * 
 * Handles:
 * - Google OAuth authentication
 * - Guest login
 * - User session management
 * - Admin role assignment
 */

class AuthController {
    /**
     * Google OAuth Login
     */
    async googleLogin(req, res, next) {
        try {
            const { credential } = req.body;

            if (!credential) {
                throw new AuthenticationError('No credential provided');
            }

            // Verify Google token
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: env.googleClientId,
            });

            const payload = ticket.getPayload();
            const { sub: googleId, email, name, picture } = payload;

            // Check if email is in admin whitelist
            const adminEmails = env.adminEmails || [];
            const isAdmin = adminEmails.includes(email);
            const role = isAdmin ? 'admin' : 'user';

            logger.info('Google OAuth login attempt', { email, isAdmin });

            // Find or create user
            let user = await User.findOne({ googleId });

            if (user) {
                // Update existing user
                user.email = email;
                user.profile.name = name;
                user.profile.picture = picture;
                user.role = role;
                await user.updateLastLogin(req.ip);
            } else {
                // Create new user
                user = await User.create({
                    googleId,
                    email,
                    profile: {
                        name,
                        picture,
                    },
                    role,
                    lastLoginIp: req.ip,
                    lastLoginAt: new Date(),
                });

                logger.info('New user created via Google OAuth', { userId: user._id, email });
            }

            // Generate JWT
            const token = jwt.sign(
                {
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                },
                env.jwtSecret,
                { expiresIn: env.jwtExpiresIn || '7d' }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user._id,
                    googleId: user.googleId,
                    email: user.email,
                    name: user.profile.name,
                    picture: user.profile.picture,
                    role: user.role,
                    isAdmin: user.isAdmin(),
                },
            });
        } catch (error) {
            logger.error('Google auth error:', { error: error.message });
            next(error);
        }
    }

    /**
     * Guest Login
     */
    async guestLogin(req, res, next) {
        try {
            const guestEmail = `guest_${Date.now()}@nmiet.local`;
            const guestName = 'Guest User';

            logger.info('Guest login attempt');

            // Create guest user
            const user = await User.create({
                googleId: `guest_${Date.now()}`,
                email: guestEmail,
                profile: {
                    name: guestName,
                    picture: 'https://ui-avatars.com/api/?name=Guest&background=6366f1&color=fff&size=128',
                },
                role: 'user',
                lastLoginIp: req.ip,
                lastLoginAt: new Date(),
            });

            // Generate JWT
            const token = jwt.sign(
                {
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                },
                env.jwtSecret,
                { expiresIn: '24h' } // Shorter expiry for guests
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user._id,
                    googleId: user.googleId,
                    email: user.email,
                    name: user.profile.name,
                    picture: user.profile.picture,
                    role: user.role,
                    isAdmin: false,
                },
            });
        } catch (error) {
            logger.error('Guest auth error:', { error: error.message });
            next(error);
        }
    }

    /**
     * Get Current User
     */
    async getCurrentUser(req, res, next) {
        try {
            const user = req.user;

            res.json({
                success: true,
                user: {
                    id: user._id,
                    googleId: user.googleId,
                    email: user.email,
                    name: user.profile.name,
                    picture: user.profile.picture,
                    role: user.role,
                    isAdmin: user.isAdmin(),
                },
            });
        } catch (error) {
            logger.error('Get user error:', { error: error.message });
            next(error);
        }
    }

    /**
     * Logout
     */
    async logout(req, res, next) {
        try {
            // In a stateless JWT system, logout is handled client-side
            // by removing the token. This endpoint is here for consistency.

            logger.info('User logout', { userId: req.user._id });

            res.json({
                success: true,
                message: 'Logged out successfully',
            });
        } catch (error) {
            logger.error('Logout error:', { error: error.message });
            next(error);
        }
    }
}

export default new AuthController();
