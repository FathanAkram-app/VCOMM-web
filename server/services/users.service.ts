import { IStorage } from '../storage';
import { User } from '@shared/schema';

export class UsersService {
  constructor(
    private storage: IStorage,
    private getClients?: () => Map<number, Map<string, any>>
  ) { }

  setClientsProvider(getClients: () => Map<number, Map<string, any>>) {
    this.getClients = getClients;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await this.storage.getAllUsers();
    return users.map(user => this.enrichUserWithStatus(user));
  }

  async getUserById(userId: number): Promise<User | undefined> {
    const user = await this.storage.getUser(userId);
    return user ? this.enrichUserWithStatus(user) : undefined;
  }

  private enrichUserWithStatus(user: User): User {
    if (!this.getClients) return user;

    const userClients = this.getClients().get(user.id);
    const isOnline = userClients && userClients.size > 0;

    return {
      ...user,
      status: isOnline ? 'online' : 'offline'
    };
  }

  async getUserSettings(userId: number): Promise<any> {
    return await this.storage.getUserSettings(userId);
  }

  async updateUserSettings(userId: number, settings: any): Promise<any> {
    return await this.storage.updateUserSettings(userId, settings);
  }

  async updateUserStatus(userId: number, status: string): Promise<User | undefined> {
    // We no longer save status to DB, but we keep this method for backward compatibility
    // if other parts of the system still call it.
    // It returns the user with their dynamic status.
    const user = await this.getUserById(userId);
    return user;
  }

  getSafeUserData(user: User) {
    const enrichedUser = this.enrichUserWithStatus(user);
    return {
      id: enrichedUser.id,
      callsign: enrichedUser.callsign,
      fullName: enrichedUser.fullName,
      rank: enrichedUser.rank,
      status: enrichedUser.status
    };
  }
}
