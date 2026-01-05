import { IStorage } from '../storage';

export class LapsitService {
  constructor(private storage: IStorage) {}

  async getCategories() {
    return await this.storage.getLapsitCategories();
  }

  async createReport(reportData: any) {
    console.log('[LAPSIT Service] Creating report:', reportData);
    return await this.storage.createLapsitReport(reportData);
  }

  async getReports() {
    console.log('[LAPSIT Service] Fetching reports');
    const reports = await this.storage.getLapsitReports();
    console.log(`[LAPSIT Service] Found ${reports.length} reports`);
    return reports;
  }
}
