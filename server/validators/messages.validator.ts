import { Request, Response, NextFunction } from 'express';

export const validateSendMessage = (req: Request, res: Response, next: NextFunction) => {
  const { conversationId, content } = req.body;

  if (!conversationId || isNaN(parseInt(conversationId))) {
    return res.status(400).json({ message: 'Valid conversation ID is required' });
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ message: 'Message content is required' });
  }

  next();
};

export const validateMessageId = (req: Request, res: Response, next: NextFunction) => {
  const messageId = parseInt(req.params.id);

  if (isNaN(messageId)) {
    return res.status(400).json({ message: 'Invalid message ID' });
  }

  next();
};

export const validateForwardMessage = (req: Request, res: Response, next: NextFunction) => {
  const { targetConversationIds } = req.body;

  if (!Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
    return res.status(400).json({ message: 'Target conversation IDs must be a non-empty array' });
  }

  next();
};
