import { IStorage } from '../storage';
import { User } from '@shared/schema';

export class UsersService {
  constructor(private storage: IStorage) {}

  async getAllUsers(): Promise<User[]> {
    return await this.storage.getAllUsers();
  }

  async getUserById(userId: number): Promise<User | undefined> {
    return await this.storage.getUser(userId);
  }

  async getUserSettings(userId: number): Promise<any> {
    return await this.storage.getUserSettings(userId);
  }

  async updateUserSettings(userId: number, settings: any): Promise<any> {
    return await this.storage.updateUserSettings(userId, settings);
  }

  async updateUserStatus(userId: number, status: string): Promise<User | undefined> {
    return await this.storage.updateUserStatus(userId, status);
  }

  getSafeUserData(user: User) {
    return {
      id: user.id,
      callsign: user.callsign,
      fullName: user.fullName,
      rank: user.rank,
      status: user.status
    };
  }
}
