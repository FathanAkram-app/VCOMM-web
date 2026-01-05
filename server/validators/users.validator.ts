import { Request, Response, NextFunction } from 'express';

export const validateUserId = (req: Request, res: Response, next: NextFunction) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  next();
};

export const validateUpdateStatus = (req: Request, res: Response, next: NextFunction) => {
  const { status } = req.body;

  if (!status || typeof status !== 'string') {
    return res.status(400).json({ message: 'Invalid status' });
  }

  next();
};
