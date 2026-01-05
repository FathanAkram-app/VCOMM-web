import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';

export class AdminController {
  constructor(private adminService: AdminService) {}

  private getAdminId(req: any): number {
    const user = req.user?.claims || req.session?.user;
    return user.id || user.sub;
  }

  // Config Management
  getAllConfigs = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const configs = await this.adminService.getAllConfigs();
      return res.json(configs);
    } catch (error) {
      console.error('Error fetching configs:', error);
      return res.status(500).json({ message: 'Failed to fetch configurations' });
    }
  };

  updateConfig = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { configValue } = req.body;
      const adminId = this.getAdminId(req);

      const config = await this.adminService.updateConfig(parseInt(id), configValue, adminId, req);
      return res.json(config);
    } catch (error) {
      console.error('Error updating config:', error);
      return res.status(500).json({ message: 'Failed to update configuration' });
    }
  };

  // Ranks Management
  getAllRanks = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const ranks = await this.adminService.getAllRanks();
      return res.json(ranks);
    } catch (error) {
      console.error('Error fetching ranks:', error);
      return res.status(500).json({ message: 'Failed to fetch ranks' });
    }
  };

  createRank = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const adminId = this.getAdminId(req);
      const rank = await this.adminService.createRank(req.body, adminId, req);
      return res.status(201).json(rank);
    } catch (error) {
      console.error('Error creating rank:', error);
      return res.status(500).json({ message: 'Failed to create rank' });
    }
  };

  updateRank = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const adminId = this.getAdminId(req);
      const rank = await this.adminService.updateRank(parseInt(id), req.body, adminId, req);
      return res.json(rank);
    } catch (error) {
      console.error('Error updating rank:', error);
      return res.status(500).json({ message: 'Failed to update rank' });
    }
  };

  deleteRank = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const adminId = this.getAdminId(req);
      await this.adminService.deleteRank(parseInt(id), adminId, req);
      return res.json({ message: 'Rank deleted successfully' });
    } catch (error) {
      console.error('Error deleting rank:', error);
      return res.status(500).json({ message: 'Failed to delete rank' });
    }
  };

  // Branches Management
  getAllBranches = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const branches = await this.adminService.getAllBranches();
      return res.json(branches);
    } catch (error) {
      console.error('Error fetching branches:', error);
      return res.status(500).json({ message: 'Failed to fetch branches' });
    }
  };

  createBranch = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const adminId = this.getAdminId(req);
      const branch = await this.adminService.createBranch(req.body, adminId, req);
      return res.status(201).json(branch);
    } catch (error) {
      console.error('Error creating branch:', error);
      return res.status(500).json({ message: 'Failed to create branch' });
    }
  };

  updateBranch = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const adminId = this.getAdminId(req);
      const branch = await this.adminService.updateBranch(parseInt(id), req.body, adminId, req);
      return res.json(branch);
    } catch (error) {
      console.error('Error updating branch:', error);
      return res.status(500).json({ message: 'Failed to update branch' });
    }
  };

  deleteBranch = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const adminId = this.getAdminId(req);
      await this.adminService.deleteBranch(parseInt(id), adminId, req);
      return res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
      console.error('Error deleting branch:', error);
      return res.status(500).json({ message: 'Failed to delete branch' });
    }
  };

  // Users Management
  getAllUsers = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const users = await this.adminService.getAllUsers();
      return res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }
  };

  updateUserRole = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminId = this.getAdminId(req);
      const user = await this.adminService.updateUserRole(parseInt(id), role, adminId, req);
      return res.json(user);
    } catch (error) {
      console.error('Error updating user role:', error);
      return res.status(500).json({ message: 'Failed to update user role' });
    }
  };

  updateUserStatus = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminId = this.getAdminId(req);
      const user = await this.adminService.updateUserStatus(parseInt(id), status, adminId, req);
      return res.json(user);
    } catch (error) {
      console.error('Error updating user status:', error);
      return res.status(500).json({ message: 'Failed to update user status' });
    }
  };

  deleteUser = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const adminId = this.getAdminId(req);
      await this.adminService.deleteUser(parseInt(id), adminId, req);
      return res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ message: 'Failed to delete user' });
    }
  };

  // Dashboard
  getDashboardStats = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const stats = await this.adminService.getDashboardStats();
      return res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
    }
  };

  getSystemHealth = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const health = await this.adminService.getSystemHealth();
      return res.json(health);
    } catch (error) {
      console.error('Error fetching system health:', error);
      return res.status(500).json({ message: 'Failed to fetch system health' });
    }
  };

  getSecurityInfo = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const security = await this.adminService.getSecurityInfo();
      return res.json(security);
    } catch (error) {
      console.error('Error fetching security info:', error);
      return res.status(500).json({ message: 'Failed to fetch security information' });
    }
  };

  // Logs
  getAdminLogs = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const logs = await this.adminService.getAdminLogs();
      return res.json(logs);
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      return res.status(500).json({ message: 'Failed to fetch admin activity logs' });
    }
  };

  // LAPSIT Management (Admin)
  getAllLapsitReports = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const reports = await this.adminService.getAllLapsitReports();
      return res.json(reports);
    } catch (error) {
      console.error('Error fetching lapsit reports:', error);
      return res.status(500).json({ message: 'Failed to fetch lapsit reports' });
    }
  };

  deleteLapsitReport = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const adminId = this.getAdminId(req);
      await this.adminService.deleteLapsitReport(parseInt(id), adminId, req);
      return res.json({ message: 'Lapsit report deleted successfully' });
    } catch (error) {
      console.error('Error deleting lapsit report:', error);
      return res.status(500).json({ message: 'Failed to delete lapsit report' });
    }
  };
}
