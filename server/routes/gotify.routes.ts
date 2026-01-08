import { Router, Request, Response } from 'express';

const router = Router();

// Gotify configuration from environment
const GOTIFY_URL = process.env.GOTIFY_URL || 'http://gotify';
const GOTIFY_APP_TOKEN = process.env.GOTIFY_APP_TOKEN || 'A8HRPAtOQJay_X1';

/**
 * Create a new Gotify client token for mobile app
 * POST /api/gotify/create-client
 */
router.post('/create-client', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Client name is required' });
    }

    // Create a new client using Gotify API
    const response = await fetch(`${GOTIFY_URL}/client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gotify-Key': GOTIFY_APP_TOKEN,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gotify API] Create client failed:', response.status, errorText);
      return res.status(response.status).json({
        message: 'Failed to create Gotify client',
        error: errorText,
      });
    }

    const client = await response.json();
    console.log('[Gotify API] Client created:', client.name);

    return res.status(201).json({
      token: client.token,
      name: client.name,
      id: client.id,
    });
  } catch (error) {
    console.error('[Gotify API] Error creating client:', error);
    return res.status(500).json({
      message: 'Internal server error while creating Gotify client',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get Gotify server health status
 * GET /api/gotify/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${GOTIFY_URL}/health`);
    const isHealthy = response.ok;

    return res.status(isHealthy ? 200 : 503).json({
      healthy: isHealthy,
      status: response.status,
      url: GOTIFY_URL,
    });
  } catch (error) {
    console.error('[Gotify API] Health check failed:', error);
    return res.status(503).json({
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Test notification - useful for debugging
 * POST /api/gotify/test
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { title, message } = req.body;

    const response = await fetch(`${GOTIFY_URL}/message?token=${GOTIFY_APP_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title || 'Test Notification',
        message: message || 'This is a test notification from VComm',
        priority: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        message: 'Failed to send test notification',
        error: errorText,
      });
    }

    const result = await response.json();
    return res.status(200).json({
      message: 'Test notification sent',
      id: result.id,
    });
  } catch (error) {
    console.error('[Gotify API] Error sending test notification:', error);
    return res.status(500).json({
      message: 'Failed to send test notification',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
