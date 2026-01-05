import { cmsStorage } from '../storage-cms';

export class PublicService {
  async getRanks() {
    return await cmsStorage.getAllRanks();
  }

  async getBranches() {
    return await cmsStorage.getAllBranches();
  }
}
