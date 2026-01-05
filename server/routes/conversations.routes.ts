import { Router } from 'express';
import { ConversationsController } from '../controllers/conversations.controller';
import {
  validateConversationId,
  validateCreateConversation,
  validateCreateDirectChat,
  validateAddMember
} from '../validators/conversations.validator';
import { isAuthenticated } from '../auth';

export function createConversationsRoutes(conversationsController: ConversationsController): Router {
  const router = Router();

  // List conversations
  router.get('/conversations', isAuthenticated, conversationsController.getUserConversations);
  router.get('/rooms', isAuthenticated, conversationsController.getGroupRooms);
  router.get('/direct-chats', isAuthenticated, conversationsController.getDirectChats);

  // Get specific conversation
  router.get('/conversations/:id', isAuthenticated, validateConversationId, conversationsController.getConversationById);

  // Create conversations
  router.post('/conversations', isAuthenticated, validateCreateConversation, conversationsController.createConversation);
  router.post('/direct-chats', isAuthenticated, validateCreateDirectChat, conversationsController.createDirectChat);

  // Delete/Clear conversations
  router.delete('/conversations/:id', isAuthenticated, validateConversationId, conversationsController.deleteConversation);
  router.delete('/conversations/:id/clear', isAuthenticated, validateConversationId, conversationsController.clearConversation);
  router.post('/conversations/:id/clear', isAuthenticated, validateConversationId, conversationsController.clearConversation);

  // Hide/Delete for user
  router.post('/conversations/:id/hide', isAuthenticated, validateConversationId, conversationsController.hideConversation);
  router.post('/conversations/:id/delete', isAuthenticated, validateConversationId, conversationsController.deleteConversationForUser);

  // Mark as read
  router.post('/conversations/:id/mark-read', isAuthenticated, validateConversationId, conversationsController.markAsRead);

  // Conversation members
  router.get('/conversations/:id/members', isAuthenticated, validateConversationId, conversationsController.getMembers);
  router.post('/conversation-members', isAuthenticated, validateAddMember, conversationsController.addMember);

  return router;
}
