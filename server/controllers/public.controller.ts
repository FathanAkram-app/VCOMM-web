import { Request, Response } from 'express';
import { PublicService } from '../services/public.service';

export class PublicController {
  constructor(private publicService: PublicService) {}

  getRanks = async (_req: Request, res: Response): Promise<Response | void> => {
    try {
      const ranks = await this.publicService.getRanks();
      return res.json(ranks);
    } catch (error) {
      console.error('Error fetching ranks:', error);
      return res.status(500).json({ message: 'Failed to fetch ranks' });
    }
  };

  getBranches = async (_req: Request, res: Response): Promise<Response | void> => {
    try {
      const branches = await this.publicService.getBranches();
      return res.json(branches);
    } catch (error) {
      console.error('Error fetching branches:', error);
      return res.status(500).json({ message: 'Failed to fetch branches' });
    }
  };
}
