import { Request, Response, NextFunction } from 'express';

export const validateGroupId = (req: Request, res: Response, next: NextFunction) => {
  const groupId = parseInt(req.params.groupId);

  if (isNaN(groupId) || groupId <= 0) {
    return res.status(400).json({ message: 'Invalid group ID' });
  }

  next();
};

export const validateMemberId = (req: Request, res: Response, next: NextFunction) => {
  const memberId = parseInt(req.params.memberId);

  if (isNaN(memberId) || memberId <= 0) {
    return res.status(400).json({ message: 'Invalid member ID' });
  }

  next();
};

export const validateUpdateGroupName = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Valid group name is required' });
  }

  next();
};

export const validateAddMembers = (req: Request, res: Response, next: NextFunction) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'Valid user IDs array is required' });
  }

  next();
};

export const validateMemberRole = (req: Request, res: Response, next: NextFunction) => {
  const { role } = req.body;

  if (!role || !['admin', 'member'].includes(role)) {
    return res.status(400).json({ message: 'Valid role (admin or member) is required' });
  }

  next();
};
