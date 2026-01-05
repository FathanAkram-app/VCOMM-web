import { Request, Response, NextFunction } from 'express';
import { IStorage } from '../storage';

export function createIsAdminMiddleware(storage: IStorage) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      // Enhanced session validation
      if (!req.session || !req.session.passport || !req.session.passport.user) {
        console.log('[ADMIN ACCESS] No valid session found');
        return res.status(401).json({ message: 'Unauthorized - Session required' });
      }

      const user = req.user?.claims || req.session?.user;
      if (!user || !user.id) {
        console.log('[ADMIN ACCESS] No user ID found in session');
        return res.status(401).json({ message: 'Unauthorized - User ID required' });
      }

      // Get user data from database to check current role
      const userRecord = await storage.getUser(user.id);
      if (!userRecord) {
        console.log('[ADMIN ACCESS] User not found in database:', user.id);
        return res.status(401).json({ message: 'Unauthorized - User not found' });
      }

      if (userRecord.role !== 'admin' && userRecord.role !== 'super_admin') {
        console.log('[ADMIN ACCESS] Insufficient privileges for user:', userRecord.callsign, 'Role:', userRecord.role);
        return res.status(403).json({ message: 'Admin access required' });
      }

      console.log('[ADMIN ACCESS] Authorized admin access for:', userRecord.callsign, 'Role:', userRecord.role);
      next();
    } catch (error) {
      console.error('Error checking admin status:', error);
      res.status(500).json({ message: 'Failed to verify admin status' });
    }
  };
}
