import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { isAuthenticated } from '../auth';

export function createAdminRoutes(adminController: AdminController, isAdmin: any): Router {
  const router = Router();

  // Config Management
  router.get('/admin/config', isAuthenticated, isAdmin, adminController.getAllConfigs);
  router.put('/admin/config/:id', isAuthenticated, isAdmin, adminController.updateConfig);

  // Ranks Management
  router.get('/admin/ranks', isAuthenticated, isAdmin, adminController.getAllRanks);
  router.post('/admin/ranks', isAuthenticated, isAdmin, adminController.createRank);
  router.put('/admin/ranks/:id', isAuthenticated, isAdmin, adminController.updateRank);
  router.delete('/admin/ranks/:id', isAuthenticated, isAdmin, adminController.deleteRank);

  // Branches Management
  router.get('/admin/branches', isAuthenticated, isAdmin, adminController.getAllBranches);
  router.post('/admin/branches', isAuthenticated, isAdmin, adminController.createBranch);
  router.put('/admin/branches/:id', isAuthenticated, isAdmin, adminController.updateBranch);
  router.delete('/admin/branches/:id', isAuthenticated, isAdmin, adminController.deleteBranch);

  // Users Management
  router.get('/admin/users', isAuthenticated, isAdmin, adminController.getAllUsers);
  router.put('/admin/users/:id/role', isAuthenticated, isAdmin, adminController.updateUserRole);
  router.put('/admin/users/:id/status', isAuthenticated, isAdmin, adminController.updateUserStatus);
  router.delete('/admin/users/:id', isAuthenticated, isAdmin, adminController.deleteUser);

  // Dashboard
  router.get('/admin/dashboard/stats', isAuthenticated, isAdmin, adminController.getDashboardStats);
  router.get('/admin/dashboard/health', isAuthenticated, isAdmin, adminController.getSystemHealth);
  router.get('/admin/dashboard/security', isAuthenticated, isAdmin, adminController.getSecurityInfo);

  // Logs
  router.get('/admin/logs', isAuthenticated, isAdmin, adminController.getAdminLogs);

  // LAPSIT Management (Admin)
  router.get('/admin/lapsit', isAuthenticated, isAdmin, adminController.getAllLapsitReports);
  router.delete('/admin/lapsit/:id', isAuthenticated, isAdmin, adminController.deleteLapsitReport);

  return router;
}
