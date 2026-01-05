import { Response } from 'express';
import { AuthRequest } from '../auth';
import { MessagesService } from '../services/messages.service';
import { fcmService } from '../services/fcm.service';

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

      // Broadcast to conversation members
      console.log('[MessagesController] broadcastToConversation exists?', !!this.broadcastToConversation);
      if (this.broadcastToConversation) {
        console.log('[MessagesController] Broadcasting new message to conversation', parseInt(conversationId));
        await this.broadcastToConversation(parseInt(conversationId), {
          type: 'new_message',
          payload: { ...message, conversationId: parseInt(conversationId) }
        });
        console.log('[MessagesController] Broadcast completed');
      } else {
        console.log('[MessagesController] ⚠️ broadcastToConversation is NOT available!');
      }

      // Send push notifications to offline users
      try {
        const members = await this.messagesService.getConversationMembers(parseInt(conversationId));
        const sender = await this.messagesService.getUser(userId);
        const senderName = sender?.callsign || sender?.fullName || 'Someone';

        const conversation = await this.messagesService.getConversation(parseInt(conversationId));
        const conversationName = conversation?.isGroup ? conversation.name : undefined;

        for (const member of members) {
          if (member.userId !== userId) {
            const isOnline = await this.messagesService.isUserOnline(member.userId);
            if (!isOnline) {
              console.log(`[MessagesController] Sending push notification to offline user ${member.userId}`);
              await fcmService.sendMessageNotification(
                member.userId,
                senderName,
                content,
                parseInt(conversationId),
                conversationName
              );
            }
          }
        }
      } catch (error) {
        console.error('[MessagesController] Error sending push notifications:', error);
        // Don't fail the message send if push notification fails
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

      return res.status(201).json(messages);
    } catch (error) {
      console.error('Error forwarding message:', error);
      return res.status(500).json({ message: 'Failed to forward message' });
    }
  };
}
