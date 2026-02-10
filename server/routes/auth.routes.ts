import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateUpdateStatus, validateChangePassword } from '../validators/auth.validator';
import { isAuthenticated } from '../auth';

export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  router.post('/update-status', isAuthenticated, validateUpdateStatus, authController.updateStatus);
  router.post('/change-password', isAuthenticated, validateChangePassword, authController.changePassword);

  // Password reset endpoints (#1) - public (no auth required)
  router.post('/request-reset', authController.requestReset);
  router.post('/verify-reset', authController.verifyReset);
  router.post('/reset-password', authController.resetPassword);

  // Admin force-reset (requires auth + admin check handled upstream)
  router.post('/admin-reset-password', isAuthenticated, authController.adminResetPassword);

  return router;
}
