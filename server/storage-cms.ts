import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  militaryRanks, 
  militaryBranches, 
  militaryUnits, 
  systemConfig,
  adminLogs,
  type MilitaryRank,
  type InsertMilitaryRank,
  type MilitaryBranch,
  type InsertMilitaryBranch,
  type MilitaryUnit,
  type InsertMilitaryUnit,
  type SystemConfig,
  type InsertSystemConfig,
  type InsertAdminLog
} from "@shared/schema";

export class CMSStorage {
  // Military Ranks Management
  async getAllRanks(): Promise<MilitaryRank[]> {
    return await db.select().from(militaryRanks).orderBy(militaryRanks.level);
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
}

export const cmsStorage = new CMSStorage();