import { Request, Response } from 'express';
import { CallHistoryService } from '../services/call-history.service';

export class CallHistoryController {
  constructor(private callHistoryService: CallHistoryService) {}

  getCallHistory = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      console.log(`[API] Fetching call history for user ${userId}`);

      // Disable caching to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const callHistory = await this.callHistoryService.getCallHistory(userId);
      return res.json(callHistory);
    } catch (error) {
      console.error('Error fetching call history:', error);
      return res.status(500).json({ message: 'Failed to fetch call history' });
    }
  };

  deleteCallHistory = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id;
      const callId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      await this.callHistoryService.deleteCallHistory(callId, userId);
      return res.json({ message: 'Call history deleted successfully' });
    } catch (error) {
      console.error('Error deleting call history:', error);
      return res.status(500).json({ message: 'Failed to delete call history' });
    }
  };
}
