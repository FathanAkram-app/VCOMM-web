import { IStorage } from '../storage';

export class AuthService {
  constructor(private storage: IStorage) {}

  async updateUserStatus(userId: number, status: string): Promise<void> {
    await this.storage.updateUserStatus(userId, status);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> {
    return await this.storage.changeUserPassword(userId, currentPassword, newPassword);
  }
}
