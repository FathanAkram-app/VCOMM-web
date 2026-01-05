import { Request, Response, NextFunction } from 'express';

export const validateOffer = (req: Request, res: Response, next: NextFunction) => {
  const { callId, targetUserId, offer } = req.body;

  if (!callId || !targetUserId || !offer) {
    return res.status(400).json({ message: 'callId, targetUserId, and offer are required' });
  }

  next();
};

export const validateAnswer = (req: Request, res: Response, next: NextFunction) => {
  const { callId, targetUserId, answer } = req.body;

  if (!callId || !targetUserId || !answer) {
    return res.status(400).json({ message: 'callId, targetUserId, and answer are required' });
  }

  next();
};

export const validateIceCandidate = (req: Request, res: Response, next: NextFunction) => {
  const { callId, targetUserId, candidate } = req.body;

  if (!callId || !targetUserId || !candidate) {
    return res.status(400).json({ message: 'callId, targetUserId, and candidate are required' });
  }

  next();
};
