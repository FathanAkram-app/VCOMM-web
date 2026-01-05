import { Router } from 'express';
import { MessagesController } from '../controllers/messages.controller';
import { validateSendMessage, validateMessageId, validateForwardMessage } from '../validators/messages.validator';
import { isAuthenticated } from '../auth';

export function createMessagesRoutes(messagesController: MessagesController): Router {
  const router = Router();

  // Send message
  router.post('/messages', isAuthenticated, validateSendMessage, messagesController.sendMessage);

  // Get messages for conversation
  router.get('/conversations/:id/messages', isAuthenticated, messagesController.getMessages);

  // Delete message
  router.delete('/messages/:id', isAuthenticated, validateMessageId, messagesController.deleteMessage);

  // Forward message
  router.post('/messages/:id/forward', isAuthenticated, validateMessageId, validateForwardMessage, messagesController.forwardMessage);

  return router;
}
