import { Request, Response } from 'express';
import { LapsitService } from '../services/lapsit.service';

export class LapsitController {
  constructor(private lapsitService: LapsitService) {}

  getCategories = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const categories = await this.lapsitService.getCategories();
      return res.json(categories);
    } catch (error) {
      console.error('Error fetching lapsit categories:', error);
      return res.status(500).json({ message: 'Failed to fetch lapsit categories' });
    }
  };

  createReport = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user?.claims?.sub;
      console.log('[LAPSIT] User ID from auth:', userId);
      console.log('[LAPSIT] File received:', req.file ? req.file.originalname : 'No file');

      let attachmentUrl = null;
      let attachmentName = null;

      // Handle file upload if present
      if (req.file) {
        attachmentUrl = `/uploads/${req.file.filename}`;
        attachmentName = req.file.originalname;
        console.log(`File uploaded: ${req.file.filename} (original: ${req.file.originalname})`);
      }

      const reportData = {
        categoryId: parseInt(req.body.categoryId),
        subCategoryId: req.body.subCategoryId ? parseInt(req.body.subCategoryId) : null,
        title: req.body.title,
        content: req.body.content,
        priority: req.body.priority || 'normal',
        classification: req.body.classification || 'UNCLASSIFIED',
        location: req.body.location || null,
        attachmentUrl,
        attachmentName,
        reportedById: userId || 2
      };

      const report = await this.lapsitService.createReport(reportData);
      return res.json(report);
    } catch (error) {
      console.error('Error creating lapsit report:', error);
      return res.status(500).json({ message: 'Failed to create lapsit report' });
    }
  };

  getReports = async (req: any, res: Response): Promise<Response | void> => {
    try {
      console.log('[API] Fetching lapsit reports for authenticated user');
      const userId = req.user?.claims?.sub;
      console.log(`[API] User ID from session: ${userId}`);

      const reports = await this.lapsitService.getReports();
      console.log(`[API] Found ${reports.length} lapsit reports`);

      // Add CORS headers to ensure proper response
      res.header('Content-Type', 'application/json');
      res.header('Cache-Control', 'no-cache');
      return res.json(reports);
    } catch (error) {
      console.error('Error fetching lapsit reports:', error);
      return res.status(500).json({ message: 'Failed to fetch lapsit reports' });
    }
  };
}
