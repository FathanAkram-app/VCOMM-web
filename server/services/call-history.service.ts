import { IStorage } from '../storage';

export class CallHistoryService {
  constructor(private storage: IStorage) {}

  async getCallHistory(userId: number): Promise<any[]> {
    console.log(`[Service] Fetching call history for user ${userId}`);
    const callHistory = await this.storage.getCallHistory(userId);
    const historyArray = callHistory || [];
    console.log(`[Service] Found ${historyArray.length} call history entries for user ${userId}`);
    return historyArray;
  }

  async deleteCallHistory(callId: number, userId: number): Promise<void> {
    await this.storage.deleteCallHistory(callId, userId);
  }
}
