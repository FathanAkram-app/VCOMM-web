import { WebSocket } from 'ws';
import { ClientsMap } from '../websocket/utils/types';
import { gotifyService } from './gotify.service';
import { fcmService } from './fcm.service';
import { IStorage } from '../storage';

/**
 * Centralized Notification Service
 * Deduplicates notifications across WebSocket, Gotify, and FCM channels.
 * Only sends push (Gotify/FCM) when the user has no active WebSocket connection.
 */
class NotificationService {
  private clients: ClientsMap | null = null;
  private storage: IStorage | null = null;

  /** Called once during server startup to inject the live clients map */
  initialize(clients: ClientsMap, storage: IStorage) {
    this.clients = clients;
    this.storage = storage;
    console.log('[NotificationService] Initialized with clients map and storage');
  }

  /** Check if a user has at least one open WebSocket connection */
  isUserConnected(userId: number): boolean {
    if (!this.clients) return false;
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return false;

    // Verify at least one connection is actually OPEN
    for (const [, client] of userClients) {
      if (client.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  /**
   * Send a message notification to a user.
   * - If user has muted the conversation, skip push entirely.
   * - If user is connected via WebSocket, skip push (WebSocket already delivered the message).
   * - If user is NOT connected, send via Gotify and FCM.
   */
  async notifyMessage(
    targetUserId: number,
    senderName: string,
    messageContent: string,
    conversationId: number,
    conversationName?: string
  ): Promise<void> {
    // Check if user has muted this conversation
    if (this.storage) {
      try {
        const isMuted = await this.storage.isConversationMuted(targetUserId, conversationId);
        if (isMuted) {
          console.log(`[NotificationService] User ${targetUserId} has muted conversation ${conversationId}, skipping push`);
          return;
        }
      } catch (err) {
        console.error('[NotificationService] Error checking mute status:', err);
      }
    }

    if (this.isUserConnected(targetUserId)) {
      console.log(`[NotificationService] User ${targetUserId} is connected via WebSocket, skipping push`);
      return;
    }

    console.log(`[NotificationService] User ${targetUserId} is NOT connected, sending push notifications`);

    // Send via both Gotify and FCM in parallel (one or both may be configured)
    const promises: Promise<void>[] = [];

    promises.push(
      gotifyService.sendMessageNotification(
        targetUserId,
        senderName,
        messageContent,
        conversationId,
        conversationName
      ).catch(err => console.error('[NotificationService] Gotify error:', err))
    );

    promises.push(
      fcmService.sendMessageNotification(
        targetUserId,
        senderName,
        messageContent,
        conversationId,
        conversationName
      ).catch(err => console.error('[NotificationService] FCM error:', err))
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send a call notification to a user (push only when not connected).
   * Call notifications via WebSocket are handled separately by the call handler.
   */
  async notifyCall(
    targetUserId: number,
    callerName: string,
    callType: 'audio' | 'video',
    callId: string,
    callerId: number
  ): Promise<void> {
    if (this.isUserConnected(targetUserId)) {
      console.log(`[NotificationService] User ${targetUserId} is connected, skipping call push`);
      return;
    }

    console.log(`[NotificationService] User ${targetUserId} is NOT connected, sending call push`);

    const promises: Promise<void>[] = [];

    // Gotify call notification
    if (this.storage) {
      try {
        const userGotifyToken = await this.storage.getUserGotifyToken(targetUserId);
        if (userGotifyToken) {
          promises.push(
            gotifyService.sendCallNotification(
              userGotifyToken,
              callId,
              callerId.toString(),
              callerName,
              callType,
              false
            ).catch(err => console.error('[NotificationService] Gotify call error:', err))
          );
        }
      } catch (err) {
        console.error('[NotificationService] Error getting Gotify token:', err);
      }
    }

    // FCM call notification
    promises.push(
      fcmService.sendCallNotification(
        targetUserId,
        callerName,
        callType,
        callId,
        callerId
      ).catch(err => console.error('[NotificationService] FCM call error:', err))
    );

    await Promise.allSettled(promises);
  }
}

export const notificationService = new NotificationService();
