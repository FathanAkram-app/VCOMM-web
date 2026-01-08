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
   * Send a call notification via Gotify
   */
  async sendCallNotification(
    userId: number,
    callerName: string,
    callType: 'audio' | 'video',
    callId: string,
    callerId: number
  ): Promise<void> {
    if (!this.enabled) {
      console.log('[Gotify] Service not enabled, skipping notification');
      return;
    }

    const callTypeText = callType === 'video' ? 'Video Call' : 'Call';

    try {
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
            'client::display': {
              contentType: 'text/markdown',
            },
            'client::notification': {
              click: {
                url: `/call/${callId}`,
              },
            },
            'android.action.click': {
              onReceive: {
                intentUrl: `vcomm://call/${callId}`,
              },
            },
            data: {
              type: 'call',
              callType,
              callId,
              callerId: callerId.toString(),
              callerName,
              timestamp: new Date().toISOString(),
            },
          },
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
}

export const gotifyService = new GotifyService();
