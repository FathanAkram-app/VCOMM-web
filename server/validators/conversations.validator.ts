import { Request, Response, NextFunction } from 'express';

export const validateConversationId = (req: Request, res: Response, next: NextFunction) => {
  const conversationId = parseInt(req.params.id);

  if (isNaN(conversationId)) {
    return res.status(400).json({ message: 'Invalid conversation ID' });
  }

  next();
};

export const validateCreateConversation = (req: Request, res: Response, next: NextFunction) => {
  const { name, memberIds, isGroup } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Conversation name is required' });
  }

  if (!Array.isArray(memberIds)) {
    return res.status(400).json({ message: 'Member IDs must be an array' });
  }

  if (isGroup && memberIds.length < 2) {
    return res.status(400).json({ message: 'Group conversation must have at least 2 members' });
  }

  next();
};

export const validateCreateDirectChat = (req: Request, res: Response, next: NextFunction) => {
  const { otherUserId } = req.body;

  if (!otherUserId || isNaN(parseInt(otherUserId))) {
    return res.status(400).json({ message: 'Valid other user ID is required' });
  }

  next();
};

export const validateAddMember = (req: Request, res: Response, next: NextFunction) => {
  const { conversationId, userId } = req.body;

  if (!conversationId || isNaN(parseInt(conversationId))) {
    return res.status(400).json({ message: 'Valid conversation ID is required' });
  }

  if (!userId || isNaN(parseInt(userId))) {
    return res.status(400).json({ message: 'Valid user ID is required' });
  }

  next();
};
