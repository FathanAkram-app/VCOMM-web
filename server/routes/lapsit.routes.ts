import { Router } from 'express';
import { LapsitController } from '../controllers/lapsit.controller';
import { upload, handleUploadError, compressUploadedMedia } from '../uploads';
import { isAuthenticated } from '../auth';

export function createLapsitRoutes(lapsitController: LapsitController): Router {
  const router = Router();

  router.get('/lapsit/categories', isAuthenticated, lapsitController.getCategories);

  router.post(
    '/lapsit/reports',
    isAuthenticated,
    upload.single('image'),
    handleUploadError,
    compressUploadedMedia,
    lapsitController.createReport
  );

  router.get('/lapsit/reports', isAuthenticated, lapsitController.getReports);

  return router;
}
