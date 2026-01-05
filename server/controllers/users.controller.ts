import { Response } from 'express';
import { AuthRequest } from '../auth';
import { UsersService } from '../services/users.service';

// WebSocket broadcast function type
type BroadcastFunction = (message: any) => void;

export class UsersController {
  constructor(
    private usersService: UsersService,
    private broadcastToAll?: BroadcastFunction
  ) {}

  getAllUsers = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const users = await this.usersService.getAllUsers();
      return res.json(users);
    } catch (error) {
      console.error('Error fetching all users:', error);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }
  };

  getUserById = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await this.usersService.getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return only safe user data
      return res.json(this.usersService.getSafeUserData(user));
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return res.status(500).json({ message: 'Failed to get user' });
    }
  };

  getUserSettings = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      console.log('[API] Fetching settings for user:', userId);
      const settings = await this.usersService.getUserSettings(userId);
      return res.json(settings);
    } catch (error) {
      console.error('[API] Error fetching user settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  };

  updateUserSettings = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const settings = req.body;
      console.log('[API] Updating settings for user:', userId);

      const updatedSettings = await this.usersService.updateUserSettings(userId, settings);
      return res.json(updatedSettings);
    } catch (error) {
      console.error('[API] Error updating user settings:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  };

  updateUserStatus = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { status } = req.body;
      const user = await this.usersService.updateUserStatus(userId, status);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Broadcast status change via WebSocket
      if (this.broadcastToAll) {
        this.broadcastToAll({
          type: 'user_status',
          payload: {
            userId,
            status
          }
        });
      }

      return res.json(user);
    } catch (error) {
      console.error('Error updating status:', error);
      return res.status(500).json({ message: 'Failed to update status' });
    }
  };
}
