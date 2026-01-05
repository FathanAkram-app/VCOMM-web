import admin from 'firebase-admin';
import { db } from '../db';
import { fcmTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

class FCMService {
  private initialized = false;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // V1 API with service account (recommended)
        const serviceAccountPath = join(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
        const serviceAccountJson = readFileSync(serviceAccountPath, 'utf-8');
        const serviceAccount = JSON.parse(serviceAccountJson);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });

        this.initialized = true;
        console.log('[FCM] Firebase Admin initialized with service account');
      } else {
        console.warn('[FCM] No Firebase credentials configured. Set GOOGLE_APPLICATION_CREDENTIALS in .env');
        console.warn('[FCM] Push notifications will not be sent');
      }
    } catch (error) {
      console.error('[FCM] Failed to initialize Firebase:', error);
      console.warn('[FCM] Push notifications will not be sent');
    }
  }

  async registerToken(
    userId: number,
    token: string,
    platform: 'android' | 'ios',
    deviceId?: string
  ): Promise<void> {
    try {
      // Check if token already exists
      const [existingToken] = await db
        .select()
        .from(fcmTokens)
        .where(eq(fcmTokens.token, token));

      if (existingToken) {
        // Update timestamp
        await db
          .update(fcmTokens)
          .set({ updatedAt: new Date() })
          .where(eq(fcmTokens.token, token));
        console.log(`[FCM] Token refreshed for user ${userId}`);
      } else {
        // Insert new token
        await db.insert(fcmTokens).values({
          userId,
          token,
          platform,
          deviceId: deviceId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`[FCM] New token registered for user ${userId} on ${platform}`);
      }
    } catch (error) {
      console.error('[FCM] Error registering token:', error);
      throw error;
    }
  }

  async removeToken(token: string): Promise<void> {
    try {
      await db.delete(fcmTokens).where(eq(fcmTokens.token, token));
      console.log('[FCM] Token removed');
    } catch (error) {
      console.error('[FCM] Error removing token:', error);
    }
  }

  async getUserTokens(userId: number): Promise<string[]> {
    try {
      const tokens = await db
        .select({ token: fcmTokens.token })
        .from(fcmTokens)
        .where(eq(fcmTokens.userId, userId));
      return tokens.map(t => t.token);
    } catch (error) {
      console.error('[FCM] Error getting user tokens:', error);
      return [];
    }
  }

  async sendMessageNotification(
    userId: number,
    senderName: string,
    messageContent: string,
    conversationId: number,
    conversationName?: string
  ): Promise<void> {
    if (!this.initialized) {
      console.log('[FCM] Not initialized, skipping notification');
      return;
    }

    const tokens = await this.getUserTokens(userId);
    if (tokens.length === 0) {
      console.log(`[FCM] No tokens found for user ${userId}`);
      return;
    }

    const notificationTitle = conversationName
      ? `${senderName} in ${conversationName}`
      : senderName;

    // Truncate long messages
    const messagePreview = messageContent.length > 100
      ? messageContent.substring(0, 100) + '...'
      : messageContent;

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: notificationTitle,
          body: messagePreview,
        },
        data: {
          type: 'message',
          conversationId: conversationId.toString(),
          senderId: userId.toString(),
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'messages',
            sound: 'default',
            priority: 'high' as any,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notificationTitle,
                body: messagePreview,
              },
              sound: 'default',
            },
          },
        },
      });

      console.log(`[FCM] Message notification sent: ${response.successCount}/${tokens.length} successful`);

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        await this.cleanupInvalidTokens(tokens, response.responses);
      }
    } catch (error) {
      console.error('[FCM] Error sending message notification:', error);
    }
  }

  async sendCallNotification(
    userId: number,
    callerName: string,
    callType: 'audio' | 'video',
    callId: string,
    callerId: number
  ): Promise<void> {
    if (!this.initialized) {
      console.log('[FCM] Not initialized, skipping notification');
      return;
    }

    const tokens = await this.getUserTokens(userId);
    if (tokens.length === 0) {
      console.log(`[FCM] No tokens found for user ${userId}`);
      return;
    }

    const callTypeText = callType === 'video' ? 'video call' : 'call';

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: 'Incoming Call',
          body: `${callerName} is ${callType === 'video' ? 'video ' : ''}calling...`,
        },
        data: {
          type: 'call',
          callType,
          callId,
          callerId: callerId.toString(),
          callerName,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'calls',
            sound: 'default',
            priority: 'max' as any,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: 'Incoming Call',
                body: `${callerName} is ${callType === 'video' ? 'video ' : ''}calling...`,
              },
              sound: 'default',
            },
          },
        },
      });

      console.log(`[FCM] Call notification sent: ${response.successCount}/${tokens.length} successful`);

      if (response.failureCount > 0) {
        await this.cleanupInvalidTokens(tokens, response.responses);
      }
    } catch (error) {
      console.error('[FCM] Error sending call notification:', error);
    }
  }

  private async cleanupInvalidTokens(
    tokens: string[],
    responses: admin.messaging.SendResponse[]
  ): Promise<void> {
    const invalidTokens: string[] = [];

    responses.forEach((response, index) => {
      if (!response.success) {
        const error = response.error;
        if (
          error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[index]);
          console.log(`[FCM] Invalid token detected: ${error.code}`);
        }
      }
    });

    if (invalidTokens.length > 0) {
      console.log(`[FCM] Cleaning up ${invalidTokens.length} invalid tokens`);
      for (const token of invalidTokens) {
        await this.removeToken(token);
      }
    }
  }
}

export const fcmService = new FCMService();
