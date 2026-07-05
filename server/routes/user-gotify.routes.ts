import express from 'express';
import { isAuthenticated } from '../auth';
import { storage } from '../storage';

const router = express.Router();

// Save/update user's Gotify client token
router.post('/gotify-token', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { clientToken } = req.body;

        if (!clientToken) {
            return res.status(400).json({ error: 'Client token required' });
        }

        await storage.updateUserGotifyToken(userId, clientToken);

        console.log(`[API] User ${userId} saved Gotify token`);
        res.json({
            success: true,
            message: 'Gotify token saved successfully'
        });
    } catch (error) {
        console.error('[API] Error saving Gotify token:', error);
        res.status(500).json({ error: 'Failed to save Gotify token' });
    }
});

// Get user's Gotify token status (masked for security)
router.get('/gotify-token', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user!.id;
        const token = await storage.getUserGotifyToken(userId);

        if (token) {
            res.json({
                hasToken: true,
                maskedToken: token.substring(0, 10) + '...',
            });
        } else {
            res.json({ hasToken: false });
        }
    } catch (error) {
        console.error('[API] Error getting Gotify token:', error);
        res.status(500).json({ error: 'Failed to retrieve Gotify token status' });
    }
});

// Delete user's Gotify token
router.delete('/gotify-token', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user!.id;
        await storage.deleteUserGotifyToken(userId);

        console.log(`[API] User ${userId} deleted Gotify token`);
        res.json({
            success: true,
            message: 'Gotify token deleted successfully'
        });
    } catch (error) {
        console.error('[API] Error deleting Gotify token:', error);
        res.status(500).json({ error: 'Failed to delete Gotify token' });
    }
});

// Get FULL token (not masked) - for mobile app use only  
router.get('/gotify-token/full', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user!.id;
        const token = await storage.getUserGotifyToken(userId);

        if (token) {
            res.json({ clientToken: token });
        } else {
            res.status(404).json({ error: 'No Gotify token found' });
        }
    } catch (error) {
        console.error('[API] Error getting full Gotify token:', error);
        res.status(500).json({ error: 'Failed to retrieve Gotify token' });
    }
});

export default router;
