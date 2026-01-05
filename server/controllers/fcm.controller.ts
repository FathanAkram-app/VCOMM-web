import { Response } from 'express';
import { AuthRequest } from '../auth';
import { fcmService } from '../services/fcm.service';

export class FCMController {
  async registerToken(req: AuthRequest, res: Response) {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { token, platform, deviceId } = req.body;

      if (!token || !platform) {
        return res.status(400).json({ message: 'Token and platform are required' });
      }

      if (platform !== 'android' && platform !== 'ios') {
        return res.status(400).json({ message: 'Platform must be either "android" or "ios"' });
      }

      await fcmService.registerToken(userId, token, platform, deviceId);

      return res.json({ message: 'Token registered successfully' });
    } catch (error) {
      console.error('[FCM Controller] Error registering token:', error);
      return res.status(500).json({ message: 'Failed to register token' });
    }
  }

  async unregisterToken(req: AuthRequest, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }

      await fcmService.removeToken(token);

      return res.json({ message: 'Token unregistered successfully' });
    } catch (error) {
      console.error('[FCM Controller] Error unregistering token:', error);
      return res.status(500).json({ message: 'Failed to unregister token' });
    }
  }
}
