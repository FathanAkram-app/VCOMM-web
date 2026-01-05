import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateUpdateStatus, validateChangePassword } from '../validators/auth.validator';
import { isAuthenticated } from '../auth';

export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  router.post('/update-status', isAuthenticated, validateUpdateStatus, authController.updateStatus);
  router.post('/change-password', isAuthenticated, validateChangePassword, authController.changePassword);

  return router;
}
