import { Response } from 'express';
import { AuthRequest } from '../auth';
import { AuthService } from '../services/auth.service';

export class AuthController {
  constructor(private authService: AuthService) {}

  updateStatus = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { status } = req.body;
      await this.authService.updateUserStatus(userId, status);

      return res.json({ message: 'Status updated successfully', status });
    } catch (error) {
      console.error('Error updating user status:', error);
      return res.status(500).json({ message: 'Failed to update status' });
    }
  };

  changePassword = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { currentPassword, newPassword } = req.body;
      const result = await this.authService.changePassword(userId, currentPassword, newPassword);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).json({ message: 'Failed to change password' });
    }
  };
}
