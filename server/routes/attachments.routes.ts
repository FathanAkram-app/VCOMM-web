import { Router } from 'express';
import { AttachmentsController } from '../controllers/attachments.controller';
import { upload, handleUploadError, compressUploadedMedia } from '../uploads';
import { isAuthenticated } from '../auth';

export function createAttachmentsRoutes(attachmentsController: AttachmentsController): Router {
  const router = Router();

  router.post(
    '/attachments/upload',
    isAuthenticated,
    upload.single('file'),
    handleUploadError,
    compressUploadedMedia,
    attachmentsController.uploadFile
  );

  return router;
}
