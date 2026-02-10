import { Response } from 'express';
import { AuthRequest } from '../auth';
import { MessagesService } from '../services/messages.service';
import { notificationService } from '../services/notification.service';

type BroadcastFunction = (conversationId: number, message: any) => Promise<void>;

export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private broadcastToConversation?: BroadcastFunction
  ) {}

  sendMessage = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const { conversationId, content, replyToId, classification, hasAttachment, attachmentType, attachmentUrl, attachmentName, attachmentSize } = req.body;

      const message = await this.messagesService.sendMessage({
        content,
        senderId: userId,
        conversationId: parseInt(conversationId),
        classification: classification || 'UNCLASSIFIED',
        replyToId: replyToId ? parseInt(replyToId) : undefined,
        hasAttachment: hasAttachment || false,
        attachmentType,
        attachmentUrl,
        attachmentName,
        attachmentSize: attachmentSize ? parseInt(attachmentSize) : undefined,
      });

      // Get sender info for notifications
      const sender = await this.messagesService.getUser(userId);
      const senderName = sender?.callsign || sender?.fullName || 'Someone';

      // Broadcast to conversation members
      console.log('[MessagesController] broadcastToConversation exists?', !!this.broadcastToConversation);
      if (this.broadcastToConversation) {
        const broadcastPayload = {
          type: 'new_message',
          payload: {
            ...message,
            conversationId: parseInt(conversationId),
            senderName,  // Include senderName for mobile notifications
            senderId: userId  // Ensure senderId is included as number
          }
        };
        console.log('[MessagesController] Broadcasting new message to conversation', parseInt(conversationId));
        console.log('[MessagesController] Broadcast payload:', JSON.stringify({
          type: broadcastPayload.type,
          senderId: broadcastPayload.payload.senderId,
          senderName: broadcastPayload.payload.senderName,
          content: broadcastPayload.payload.content?.substring(0, 50)
        }));
        await this.broadcastToConversation(parseInt(conversationId), broadcastPayload);
        console.log('[MessagesController] Broadcast completed');
      } else {
        console.log('[MessagesController] ⚠️ broadcastToConversation is NOT available!');
      }

      // Send push notifications to offline conversation members (deduped via NotificationService)
      try {
        const members = await this.messagesService.getConversationMembers(parseInt(conversationId));
        const conversation = await this.messagesService.getConversation(parseInt(conversationId));
        const conversationName = conversation?.isGroup ? conversation.name : undefined;

        for (const member of members) {
          if (member.userId !== userId) {
            await notificationService.notifyMessage(
              member.userId,
              senderName,
              content,
              parseInt(conversationId),
              conversationName
            );
          }
        }
      } catch (error) {
        console.error('[MessagesController] Error sending notifications:', error);
      }

      return res.status(201).json(message);
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ message: 'Failed to send message' });
    }
  };

  getMessages = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const conversationId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      const result = await this.messagesService.getConversationMessages(conversationId, userId, limit, offset);

      return res.json(result);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ message: 'Failed to fetch messages' });
    }
  };

  deleteMessage = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const messageId = parseInt(req.params.id);
      const { deleteForEveryone } = req.body;

      await this.messagesService.deleteMessage(messageId, userId, deleteForEveryone || false);

      return res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      return res.status(500).json({ message: 'Failed to delete message' });
    }
  };

  forwardMessage = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const messageId = parseInt(req.params.id);
      const { targetConversationIds } = req.body;

      const messages = await this.messagesService.forwardMessage(messageId, targetConversationIds, userId);

      // Broadcast and notify for each forwarded message (#3 Forwarding Notifications)
      const sender = await this.messagesService.getUser(userId);
      const senderName = sender?.callsign || sender?.fullName || 'Someone';

      for (const msg of messages) {
        const convId = msg.conversationId;

        // Broadcast via WebSocket to conversation members
        if (this.broadcastToConversation) {
          await this.broadcastToConversation(convId, {
            type: 'new_message',
            payload: {
              ...msg,
              conversationId: convId,
              senderName,
              senderId: userId,
            },
          });
        }

        // Push notifications to offline members
        try {
          const members = await this.messagesService.getConversationMembers(convId);
          const conversation = await this.messagesService.getConversation(convId);
          const conversationName = conversation?.isGroup ? conversation.name : undefined;
          const content = msg.content || 'Forwarded message';

          for (const member of members) {
            if (member.userId !== userId) {
              await notificationService.notifyMessage(
                member.userId,
                senderName,
                content,
                convId,
                conversationName
              );
            }
          }
        } catch (error) {
          console.error(`[MessagesController] Error sending forward notifications for conv ${convId}:`, error);
        }
      }

      return res.status(201).json(messages);
    } catch (error) {
      console.error('Error forwarding message:', error);
      return res.status(500).json({ message: 'Failed to forward message' });
    }
  };
}
