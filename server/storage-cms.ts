import { eq, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  militaryRanks, 
  militaryBranches, 
  militaryUnits, 
  systemConfig,
  adminLogs,
  users,
  messages,
  conversations,
  conversationMembers,
  callHistory,
  lapsitReports,
  type MilitaryRank,
  type InsertMilitaryRank,
  type MilitaryBranch,
  type InsertMilitaryBranch,
  type MilitaryUnit,
  type InsertMilitaryUnit,
  type SystemConfig,
  type InsertSystemConfig,
  type InsertAdminLog,
  type LapsitReport
} from "@shared/schema";

export class CMSStorage {
  // Military Ranks Management
  async getAllRanks(): Promise<MilitaryRank[]> {
    return await db.select().from(militaryRanks).orderBy(militaryRanks.level);
  }

  async getRanksByBranch(branch: string): Promise<MilitaryRank[]> {
    return await db.select().from(militaryRanks)
      .where(eq(militaryRanks.branch, branch))
      .orderBy(militaryRanks.level);
  }

  async createRank(data: InsertMilitaryRank): Promise<MilitaryRank> {
    const [rank] = await db.insert(militaryRanks).values(data).returning();
    return rank;
  }

  async updateRank(id: number, data: Partial<InsertMilitaryRank>): Promise<MilitaryRank> {
    const [rank] = await db
      .update(militaryRanks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(militaryRanks.id, id))
      .returning();
    return rank;
  }

  async deleteRank(id: number): Promise<void> {
    await db.delete(militaryRanks).where(eq(militaryRanks.id, id));
  }

  // Military Branches Management
  async getAllBranches(): Promise<MilitaryBranch[]> {
    return await db.select().from(militaryBranches).orderBy(militaryBranches.branchName);
  }

  async createBranch(data: InsertMilitaryBranch): Promise<MilitaryBranch> {
    const [branch] = await db.insert(militaryBranches).values(data).returning();
    return branch;
  }

  async updateBranch(id: number, data: Partial<InsertMilitaryBranch>): Promise<MilitaryBranch> {
    const [branch] = await db
      .update(militaryBranches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(militaryBranches.id, id))
      .returning();
    return branch;
  }

  async deleteBranch(id: number): Promise<void> {
    await db.delete(militaryBranches).where(eq(militaryBranches.id, id));
  }

  // Military Units Management
  async getAllUnits(): Promise<MilitaryUnit[]> {
    return await db.select().from(militaryUnits).orderBy(militaryUnits.unitName);
  }

  async createUnit(data: InsertMilitaryUnit): Promise<MilitaryUnit> {
    const [unit] = await db.insert(militaryUnits).values(data).returning();
    return unit;
  }

  async updateUnit(id: number, data: Partial<InsertMilitaryUnit>): Promise<MilitaryUnit> {
    const [unit] = await db
      .update(militaryUnits)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(militaryUnits.id, id))
      .returning();
    return unit;
  }

  async deleteUnit(id: number): Promise<void> {
    await db.delete(militaryUnits).where(eq(militaryUnits.id, id));
  }

  // System Configuration Management
  async getAllConfigs(): Promise<SystemConfig[]> {
    return await db.select().from(systemConfig).orderBy(systemConfig.category, systemConfig.configKey);
  }

  async getConfigByKey(key: string): Promise<SystemConfig | undefined> {
    const [config] = await db.select().from(systemConfig).where(eq(systemConfig.configKey, key));
    return config;
  }

  async createConfig(data: InsertSystemConfig): Promise<SystemConfig> {
    const [config] = await db.insert(systemConfig).values(data).returning();
    return config;
  }

  async updateConfig(id: number, data: Partial<InsertSystemConfig>): Promise<SystemConfig> {
    const [config] = await db
      .update(systemConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(systemConfig.id, id))
      .returning();
    return config;
  }

  async updateConfigByKey(key: string, value: string): Promise<SystemConfig> {
    const [config] = await db
      .update(systemConfig)
      .set({ configValue: value, updatedAt: new Date() })
      .where(eq(systemConfig.configKey, key))
      .returning();
    return config;
  }

  async deleteConfig(id: number): Promise<void> {
    await db.delete(systemConfig).where(eq(systemConfig.id, id));
  }

  // Admin Activity Logging
  async logAdminActivity(data: InsertAdminLog): Promise<void> {
    await db.insert(adminLogs).values(data);
  }

  async getAdminLogs(limit: number = 100): Promise<any[]> {
    return await db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit);
  }

  // Dashboard Statistics
  async getDashboardStats(): Promise<any> {
    const [
      totalUsers,
      onlineUsers,
      totalMessages,
      todayMessages,
      totalCalls,
      todayCallsResult,
      totalConversations
    ] = await Promise.all([
      db.selectDistinct({ count: sql`count(*)` }).from(users),
      db.selectDistinct({ count: sql`count(*)` }).from(users).where(eq(users.status, 'online')),
      db.selectDistinct({ count: sql`count(*)` }).from(messages),
      db.selectDistinct({ count: sql`count(*)` }).from(messages).where(sql`DATE(${messages.createdAt}) = CURRENT_DATE`),
      db.selectDistinct({ count: sql`count(*)` }).from(callHistory),
      db.selectDistinct({ count: sql`count(*)` }).from(callHistory).where(sql`DATE(${callHistory.createdAt}) = CURRENT_DATE`),
      db.selectDistinct({ count: sql`count(*)` }).from(conversations)
    ]);

    return {
      users: {
        total: parseInt(totalUsers[0].count),
        online: parseInt(onlineUsers[0].count),
        offline: parseInt(totalUsers[0].count) - parseInt(onlineUsers[0].count)
      },
      messages: {
        total: parseInt(totalMessages[0].count),
        today: parseInt(todayMessages[0].count)
      },
      calls: {
        total: parseInt(totalCalls[0].count),
        today: parseInt(todayCallsResult[0].count)
      },
      conversations: {
        total: parseInt(totalConversations[0].count)
      }
    };
  }

  // System Health Check
  async getSystemHealth(): Promise<any> {
    try {
      // Test database connection
      await db.selectDistinct({ test: sql`1` });
      
      // Get database size (PostgreSQL specific)
      const dbSizeResult = await db.selectDistinct({ 
        size: sql`pg_size_pretty(pg_database_size(current_database()))` 
      });
      
      return {
        database: {
          status: 'healthy',
          size: dbSizeResult[0]?.size || 'Unknown'
        },
        server: {
          status: 'running',
          uptime: process.uptime(),
          memory: process.memoryUsage()
        }
      };
    } catch (error) {
      return {
        database: {
          status: 'error',
          error: error.message
        },
        server: {
          status: 'running',
          uptime: process.uptime(),
          memory: process.memoryUsage()
        }
      };
    }
  }

  // Security Monitoring - Get recent failed login attempts
  async getSecurityEvents(): Promise<any[]> {
    return await db.select()
      .from(adminLogs)
      .where(sql`${adminLogs.action} LIKE '%LOGIN%' OR ${adminLogs.action} LIKE '%FAILED%'`)
      .orderBy(desc(adminLogs.createdAt))
      .limit(50);
  }

  // User Management Functions
  async getAllUsersForAdmin(): Promise<any[]> {
    return await db.select({
      id: users.id,
      callsign: users.callsign,
      nrp: users.nrp,
      fullName: users.fullName,
      rank: users.rank,
      branch: users.branch,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).orderBy(users.createdAt);
  }

  async updateUserRole(userId: number, role: string): Promise<any> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStatus(userId: number, status: string): Promise<any> {
    const [user] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      // First, remove user from all conversations to avoid foreign key constraint
      await db.delete(conversationMembers).where(eq(conversationMembers.userId, userId));
      
      // Delete user messages (mark as deleted from system user)
      await db.update(messages)
        .set({ 
          senderId: 1, // System user ID
          content: '[User Deleted]',
          isDeleted: true 
        })
        .where(eq(messages.senderId, userId));
      
      // Finally delete the user
      await db.delete(users).where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      // If deletion still fails, disable user instead
      try {
        await this.disableUser(userId);
        console.log(`User ${userId} disabled instead of deleted due to constraints`);
        return true;
      } catch (disableError) {
        console.error('Error disabling user as fallback:', disableError);
        throw error;
      }
    }
  }

  async disableUser(userId: number): Promise<any> {
    const [user] = await db
      .update(users)
      .set({ status: 'disabled', updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Initialize default system configurations
  async initializeDefaultConfigs(): Promise<void> {
    const defaultConfigs = [
      {
        configKey: 'menu_chat_enabled',
        configValue: 'true',
        configDescription: 'Enable/disable Chat menu in navigation',
        configType: 'boolean',
        category: 'menu'
      },
      {
        configKey: 'menu_calls_enabled',
        configValue: 'true',
        configDescription: 'Enable/disable Calls menu in navigation',
        configType: 'boolean',
        category: 'menu'
      },
      {
        configKey: 'menu_personnel_enabled',
        configValue: 'true',
        configDescription: 'Enable/disable Personnel menu in navigation',
        configType: 'boolean',
        category: 'menu'
      },
      {
        configKey: 'menu_settings_enabled',
        configValue: 'true',
        configDescription: 'Enable/disable Settings menu in navigation',
        configType: 'boolean',
        category: 'menu'
      },
      {
        configKey: 'menu_lapsit_enabled',
        configValue: 'false',
        configDescription: 'Enable/disable Lapsit (Situation Report) menu in navigation',
        configType: 'boolean',
        category: 'menu'
      },
      {
        configKey: 'cms_lapsit_management_enabled',
        configValue: 'true',
        configDescription: 'Enable/disable Lapsit management tab in CMS dashboard',
        configType: 'boolean',
        category: 'cms'
      },
      {
        configKey: 'app_name',
        configValue: 'NXZZ-VComm',
        configDescription: 'Application name displayed in header',
        configType: 'string',
        category: 'general'
      },
      {
        configKey: 'max_file_size_mb',
        configValue: '10',
        configDescription: 'Maximum file upload size in MB',
        configType: 'number',
        category: 'feature'
      }
    ];

    for (const config of defaultConfigs) {
      const existing = await this.getConfigByKey(config.configKey);
      if (!existing) {
        await this.createConfig(config);
      }
    }
  }

  // Lapsit Management Functions
  async getAllLapsitReports(): Promise<any[]> {
    try {
      return await db.select({
        id: lapsitReports.id,
        reporterId: lapsitReports.reportedById,
        reporterName: users.callsign,
        category: lapsitReports.title,
        subcategory: lapsitReports.status,
        location: lapsitReports.location,
        priority: lapsitReports.priority,
        details: lapsitReports.content,
        createdAt: lapsitReports.createdAt
      })
      .from(lapsitReports)
      .leftJoin(users, eq(lapsitReports.reportedById, users.id))
      .orderBy(desc(lapsitReports.createdAt));
    } catch (error) {
      console.error('Error fetching lapsit reports:', error);
      // Return empty array if table doesn't exist or other error
      return [];
    }
  }
}

export const cmsStorage = new CMSStorage();