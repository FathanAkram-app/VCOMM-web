import { Request, Response, NextFunction } from 'express';

export const validateUpdateStatus = (req: Request, res: Response, next: NextFunction) => {
  const { status } = req.body;

  if (!status || !['online', 'busy', 'away', 'offline'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  next();
};

export const validateChangePassword = (req: Request, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long' });
  }

  next();
};
