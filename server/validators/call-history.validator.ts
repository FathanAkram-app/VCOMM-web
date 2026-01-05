import { Request, Response, NextFunction } from 'express';

export const validateCallId = (req: Request, res: Response, next: NextFunction) => {
  const callId = parseInt(req.params.id);

  if (isNaN(callId)) {
    return res.status(400).json({ message: 'Invalid call ID' });
  }

  next();
};
