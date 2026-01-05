import { Response } from 'express';
import { AuthRequest } from '../auth';
import { ConversationsService } from '../services/conversations.service';

export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  getUserConversations = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const conversations = await this.conversationsService.getUserConversations(userId);
      const formatted = this.conversationsService.formatConversations(conversations);

      console.log(`[API] Returning ${formatted.length} conversations for user ${userId}`);
      return res.json(formatted);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  };

  getGroupRooms = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const conversations = await this.conversationsService.getUserConversations(userId);
      const rooms = this.conversationsService.filterGroupConversations(conversations);

      return res.json(rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return res.status(500).json({ message: 'Failed to fetch rooms' });
    }
  };

  getDirectChats = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const conversations = await this.conversationsService.getUserConversations(userId);
      const directChats = this.conversationsService.filterDirectChats(conversations);

      return res.json(directChats);
    } catch (error) {
      console.error('Error fetching direct chats:', error);
      return res.status(500).json({ message: 'Failed to fetch direct chats' });
    }
  };

  getConversationById = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await this.conversationsService.getConversationById(conversationId);

      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      return res.json(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return res.status(500).json({ message: 'Failed to fetch conversation' });
    }
  };

  createConversation = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const { name, memberIds, isGroup } = req.body;

      const conversation = await this.conversationsService.createConversation({
        name,
        isGroup: isGroup ?? true,
        createdById: userId,
      });

      // Add creator as admin
      await this.conversationsService.addConversationMember({
        conversationId: conversation.id,
        userId,
        role: 'admin',
      });

      // Add other members
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          await this.conversationsService.addConversationMember({
            conversationId: conversation.id,
            userId: memberId,
            role: 'member',
          });
        }
      }

      return res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      return res.status(500).json({ message: 'Failed to create conversation' });
    }
  };

  createDirectChat = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const { otherUserId } = req.body;
      const conversation = await this.conversationsService.createDirectChat(userId, parseInt(otherUserId));

      return res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating direct chat:', error);
      return res.status(500).json({ message: 'Failed to create direct chat' });
    }
  };

  deleteConversation = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const conversationId = parseInt(req.params.id);
      await this.conversationsService.deleteConversation(conversationId);

      return res.json({ message: 'Conversation deleted successfully' });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return res.status(500).json({ message: 'Failed to delete conversation' });
    }
  };

  clearConversation = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const conversationId = parseInt(req.params.id);
      await this.conversationsService.clearConversationMessages(conversationId);

      return res.json({ message: 'Conversation cleared successfully' });
    } catch (error) {
      console.error('Error clearing conversation:', error);
      return res.status(500).json({ message: 'Failed to clear conversation' });
    }
  };

  hideConversation = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const conversationId = parseInt(req.params.id);
      await this.conversationsService.hideConversation(userId, conversationId);

      return res.json({ message: 'Conversation hidden successfully' });
    } catch (error) {
      console.error('Error hiding conversation:', error);
      return res.status(500).json({ message: 'Failed to hide conversation' });
    }
  };

  deleteConversationForUser = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const conversationId = parseInt(req.params.id);
      await this.conversationsService.deleteConversationForUser(userId, conversationId);

      return res.json({ message: 'Conversation deleted for user successfully' });
    } catch (error) {
      console.error('Error deleting conversation for user:', error);
      return res.status(500).json({ message: 'Failed to delete conversation' });
    }
  };

  markAsRead = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session' });
      }

      const conversationId = parseInt(req.params.id);
      await this.conversationsService.markConversationAsRead(userId, conversationId);

      return res.json({ message: 'Conversation marked as read' });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return res.status(500).json({ message: 'Failed to mark as read' });
    }
  };

  // Conversation Members
  getMembers = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const conversationId = parseInt(req.params.id);
      const members = await this.conversationsService.getConversationMembers(conversationId);

      return res.json(members);
    } catch (error) {
      console.error('Error fetching members:', error);
      return res.status(500).json({ message: 'Failed to fetch members' });
    }
  };

  addMember = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const { conversationId, userId, role } = req.body;

      const member = await this.conversationsService.addConversationMember({
        conversationId: parseInt(conversationId),
        userId: parseInt(userId),
        role: role || 'member',
      });

      return res.status(201).json(member);
    } catch (error) {
      console.error('Error adding member:', error);
      return res.status(500).json({ message: 'Failed to add member' });
    }
  };
}
