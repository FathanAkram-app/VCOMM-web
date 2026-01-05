import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { validateUserId, validateUpdateStatus } from '../validators/users.validator';
import { isAuthenticated } from '../auth';

export function createUsersRoutes(usersController: UsersController): Router {
  const router = Router();

  // Get all users
  router.get('/all-users', isAuthenticated, usersController.getAllUsers);
  router.get('/users', isAuthenticated, usersController.getAllUsers);

  // Get specific user by ID
  router.get('/users/:userId', isAuthenticated, validateUserId, usersController.getUserById);

  // User settings
  router.get('/user-settings', isAuthenticated, usersController.getUserSettings);
  router.put('/user-settings', isAuthenticated, usersController.updateUserSettings);

  // Update user status
  router.put('/users/status', isAuthenticated, validateUpdateStatus, usersController.updateUserStatus);

  return router;
}
