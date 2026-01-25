/**
 * Gotify Notification Service
 * Handles push notifications via self-hosted Gotify server
 */

class GotifyService {
  private gotifyUrl: string;
  private appToken: string;
  private enabled: boolean = false;

  constructor() {
    // Use localhost for backend-to-gotify communication (both in same docker network)
    this.gotifyUrl = process.env.GOTIFY_URL || 'http://gotify';
    this.appToken = process.env.GOTIFY_APP_TOKEN || 'A8HRPAtOQJay_X1';

    if (this.appToken) {
      this.enabled = true;
      console.log('[Gotify] Service initialized');
    } else {
      console.warn('[Gotify] No app token configured. Set GOTIFY_APP_TOKEN in .env');
    }
  }

  /**
   * Send a message notification via Gotify
   */
  async sendMessageNotification(
    userId: number,
    senderName: string,
    messageContent: string,
    conversationId: number,
    conversationName?: string
  ): Promise<void> {
    if (!this.enabled) {
      console.log('[Gotify] Service not enabled, skipping notification');
      return;
    }

    const title = conversationName
      ? `${senderName} in ${conversationName}`
      : senderName;

    // Truncate long messages
    const messagePreview = messageContent.length > 100
      ? messageContent.substring(0, 100) + '...'
      : messageContent;

    try {
      const response = await fetch(`${this.gotifyUrl}/message?token=${this.appToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          message: messagePreview,
          priority: 5,
          extras: {
            'client::display': {
              contentType: 'text/markdown',
            },
            'client::notification': {
              click: {
                url: `/chat/${conversationId}`,
              },
            },
            'android.action.click': {
              onReceive: {
                intentUrl: `vcomm://conversation/${conversationId}`,
              },
            },
            data: {
              type: 'message',
              conversationId: conversationId.toString(),
              senderId: userId.toString(),
              timestamp: new Date().toISOString(),
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Gotify] Failed to send notification:', response.status, errorText);
        return;
      }

      const result = await response.json();
      console.log('[Gotify] Message notification sent:', result.id);
    } catch (error) {
      console.error('[Gotify] Error sending message notification:', error);
    }
  }

  /**
   * Send a call notification via Gotify using user's client token
   */
  async sendCallNotification(
    userClientToken: string,  // User's personal Gotify client token
    callId: string,
    callerId: string,
    callerName: string,
    callType: 'audio' | 'video' = 'audio',
    isGroupCall: boolean = false
  ): Promise<void> {
    if (!this.enabled) {
      console.log('[Gotify] Service not enabled, skipping notification');
      return;
    }

    if (!userClientToken) {
      console.warn('[Gotify] No user client token provided, skipping notification');
      return;
    }

    try {
      // Use APP token to send message (not client token)
      // The userClientToken parameter is stored for the client to receive messages,
      // but sending must use the app token
      const response = await fetch(`${this.gotifyUrl}/message?token=${this.appToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Incoming Call',
          message: `${callerName} is ${callType === 'video' ? 'video ' : ''}calling...`,
          priority: 10, // Highest priority for calls
          extras: {
            data: {
              type: 'call',
              callType,
              callId,
              callerId,
              callerName,
              isGroupCall,
              timestamp: new Date().toISOString(),
            }
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Gotify] Failed to send call notification:', response.status, errorText);
        return;
      }

      const result = await response.json();
      console.log('[Gotify] Call notification sent:', result.id);
    } catch (error) {
      console.error('[Gotify] Error sending call notification:', error);
    }
  }

  /**
   * Test the Gotify connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.gotifyUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('[Gotify] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Create a new Gotify client token for a user via Gotify API
   * @param userId User ID
   * @param username Username/callsign for identification
   * @returns Client token string or null if creation fails
   */
  async createClientToken(userId: number, username: string): Promise<string | null> {
    if (!this.enabled) {
      console.warn('[Gotify] Service not enabled, cannot create client token');
      return null;
    }

    try {
      console.log(`[Gotify] Creating client token for user ${userId} (${username})`);

      // Use basic auth with admin credentials to create client tokens
      // Application tokens cannot create client tokens - only user/admin can
      const gotifyUser = process.env.GOTIFY_ADMIN_USER || 'admin';
      const gotifyPass = process.env.GOTIFY_ADMIN_PASS || 'admin123';
      const basicAuth = Buffer.from(`${gotifyUser}:${gotifyPass}`).toString('base64');

      const response = await fetch(`${this.gotifyUrl}/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          name: `vcomm-user-${userId}-${username}`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Gotify] API error creating client token: ${response.status}`, errorText);
        return null;
      }

      const data = await response.json();
      console.log(`[Gotify] Successfully created client token for user ${userId}`);
      return data.token; // Returns the client token
    } catch (error) {
      console.error(`[Gotify] Error creating client token for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Ensure a user has a Gotify client token
   * Checks database first, creates new token if needed
   * @param userId User ID
   * @param username Username/callsign
   * @returns Client token or null
   */
  async ensureUserHasToken(userId: number, username: string): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      // Import storage dynamically to avoid circular dependency
      const { storage } = await import('../storage');

      // Check if user already has a token in database
      const existingToken = await storage.getUserGotifyToken(userId);

      if (existingToken) {
        console.log(`[Gotify] User ${userId} already has a client token`);
        return existingToken;
      }

      // Create new token via Gotify API
      console.log(`[Gotify] User ${userId} has no token, creating new one`);
      const newToken = await this.createClientToken(userId, username);

      if (newToken) {
        // Save to database
        await storage.updateUserGotifyToken(userId, newToken);
        console.log(`[Gotify] Created and saved new client token for user ${userId}`);
        return newToken;
      } else {
        console.error(`[Gotify] Failed to create client token for user ${userId}`);
        return null;
      }
    } catch (error) {
      console.error(`[Gotify] Error in ensureUserHasToken for user ${userId}:`, error);
      return null;
    }
  }
}

export const gotifyService = new GotifyService();
