import { Request, Response } from 'express';
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

  /** Request password reset OTP (#1) */
  requestReset = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { callsign } = req.body;
      if (!callsign) {
        return res.status(400).json({ message: 'Callsign is required' });
      }
      const result = await this.authService.requestPasswordReset(callsign);
      return res.json(result);
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return res.status(500).json({ message: 'Failed to request password reset' });
    }
  };

  /** Verify reset OTP (#1) */
  verifyReset = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { callsign, otp } = req.body;
      if (!callsign || !otp) {
        return res.status(400).json({ message: 'Callsign and OTP are required' });
      }
      const result = await this.authService.verifyResetToken(callsign, otp);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      return res.json({ success: true, tempToken: result.tempToken });
    } catch (error) {
      console.error('Error verifying reset token:', error);
      return res.status(500).json({ message: 'Failed to verify reset code' });
    }
  };

  /** Reset password with temp token (#1) */
  resetPassword = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { tempToken, newPassword } = req.body;
      if (!tempToken || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      const result = await this.authService.resetPassword(tempToken, newPassword);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      return res.json(result);
    } catch (error) {
      console.error('Error resetting password:', error);
      return res.status(500).json({ message: 'Failed to reset password' });
    }
  };

  /** Admin force-reset password (#1) */
  adminResetPassword = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const { targetUserId, newPassword } = req.body;
      if (!targetUserId || !newPassword) {
        return res.status(400).json({ message: 'User ID and new password are required' });
      }
      const result = await this.authService.adminResetPassword(targetUserId, newPassword);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      return res.json(result);
    } catch (error) {
      console.error('Error admin resetting password:', error);
      return res.status(500).json({ message: 'Failed to reset password' });
    }
  };
}
