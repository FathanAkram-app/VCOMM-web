import { ICmsStorage } from '../storage-cms';

export class AdminService {
  constructor(private cmsStorage: ICmsStorage) {}

  // Config Management
  async getAllConfigs() {
    return await this.cmsStorage.getAllConfigs();
  }

  async updateConfig(id: number, configValue: string, adminId: number, req: any) {
    const config = await this.cmsStorage.updateConfig(id, { configValue });

    // Log admin activity
    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'UPDATE_CONFIG',
      targetTable: 'system_config',
      targetId: id.toString(),
      newData: { configValue },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return config;
  }

  // Ranks Management
  async getAllRanks() {
    return await this.cmsStorage.getAllRanks();
  }

  async createRank(data: any, adminId: number, req: any) {
    const rank = await this.cmsStorage.createRank(data);

    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'CREATE_RANK',
      targetTable: 'ranks',
      targetId: rank.id.toString(),
      newData: data,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return rank;
  }

  async updateRank(id: number, data: any, adminId: number, req: any) {
    const rank = await this.cmsStorage.updateRank(id, data);

    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'UPDATE_RANK',
      targetTable: 'ranks',
      targetId: id.toString(),
      newData: data,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return rank;
  }

  async deleteRank(id: number, adminId: number, req: any) {
    await this.cmsStorage.deleteRank(id);

    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'DELETE_RANK',
      targetTable: 'ranks',
      targetId: id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  // Branches Management
  async getAllBranches() {
    return await this.cmsStorage.getAllBranches();
  }

  async createBranch(data: any, adminId: number, req: any) {
    const branch = await this.cmsStorage.createBranch(data);

    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'CREATE_BRANCH',
      targetTable: 'branches',
      targetId: branch.id.toString(),
      newData: data,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return branch;
  }

  async updateBranch(id: number, data: any, adminId: number, req: any) {
    const branch = await this.cmsStorage.updateBranch(id, data);

    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'UPDATE_BRANCH',
      targetTable: 'branches',
      targetId: id.toString(),
      newData: data,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return branch;
  }

  async deleteBranch(id: number, adminId: number, req: any) {
    await this.cmsStorage.deleteBranch(id);

    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'DELETE_BRANCH',
      targetTable: 'branches',
      targetId: id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  // Users Management
  async getAllUsers() {
    return await this.cmsStorage.getAllUsers();
  }

  async updateUserRole(id: number, role: string, adminId: number, req: any) {
    const user = await this.cmsStorage.updateUserRole(id, role);

    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'UPDATE_USER_ROLE',
      targetTable: 'users',
      targetId: id.toString(),
      newData: { role },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return user;
  }

  async updateUserStatus(id: number, status: string, adminId: number, req: any) {
    const user = await this.cmsStorage.updateUserStatus(id, status);

    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'UPDATE_USER_STATUS',
      targetTable: 'users',
      targetId: id.toString(),
      newData: { status },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return user;
  }

  async deleteUser(id: number, adminId: number, req: any) {
    await this.cmsStorage.deleteUser(id);

    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'DELETE_USER',
      targetTable: 'users',
      targetId: id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  // Dashboard
  async getDashboardStats() {
    return await this.cmsStorage.getDashboardStats();
  }

  async getSystemHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async getSecurityInfo() {
    return { security: 'info' };
  }

  // Logs
  async getAdminLogs() {
    return await this.cmsStorage.getAdminActivityLogs();
  }

  // LAPSIT Management (Admin)
  async getAllLapsitReports() {
    return await this.cmsStorage.getAllLapsitReports();
  }

  async deleteLapsitReport(id: number, adminId: number, req: any) {
    await this.cmsStorage.deleteLapsitReport(id);

    await this.cmsStorage.logAdminActivity({
      adminId,
      action: 'DELETE_LAPSIT',
      targetTable: 'lapsit_reports',
      targetId: id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
}
