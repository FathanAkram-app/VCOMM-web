import { IStorage } from '../storage';

export class GroupsService {
  constructor(
    private storage: IStorage,
    private getClients: () => Map<number, any>
  ) {}

  async getGroupInfo(groupId: number, userId: number) {
    // Get group conversation
    const conversation = await this.storage.getConversation(groupId);
    if (!conversation || !conversation.isGroup) {
      throw new Error('Group not found');
    }

    // Check if user is member
    const membership = await this.storage.getConversationMembership(userId, groupId);
    if (!membership) {
      throw new Error('Access denied');
    }

    // Get member count
    const members = await this.storage.getConversationMembers(groupId);

    return {
      id: conversation.id,
      name: conversation.name,
      description: conversation.description,
      createdAt: conversation.createdAt,
      memberCount: members.length,
      isAdmin: membership.role === 'admin',
      classification: conversation.classification
    };
  }

  async getGroupMembers(groupId: number, userId: number) {
    // Check if user is member
    const membership = await this.storage.getConversationMembership(userId, groupId);
    if (!membership) {
      throw new Error('Access denied');
    }

    const members = await this.storage.getConversationMembers(groupId);
    const clients = this.getClients();

    // Get user details and online status
    const memberDetails = await Promise.all(
      members.map(async (member) => {
        const user = await this.storage.getUser(member.userId);
        return {
          id: user?.id,
          callsign: user?.callsign,
          fullName: user?.fullName,
          role: member.role,
          joinedAt: member.joinedAt,
          isOnline: clients.has(member.userId)
        };
      })
    );

    return memberDetails;
  }

  async checkAdminAccess(userId: number, groupId: number): Promise<void> {
    const membership = await this.storage.getConversationMembership(userId, groupId);
    if (!membership || membership.role !== 'admin') {
      throw new Error('Admin access required');
    }
  }

  async updateGroupName(groupId: number, userId: number, name: string) {
    await this.checkAdminAccess(userId, groupId);
    await this.storage.updateConversation(groupId, { name: name.trim() });
    return { name: name.trim() };
  }

  async updateGroupDescription(groupId: number, userId: number, description: string | null) {
    await this.checkAdminAccess(userId, groupId);
    const trimmedDescription = description?.trim() || null;
    await this.storage.updateConversation(groupId, { description: trimmedDescription });
    return { description: trimmedDescription };
  }

  async addMembers(groupId: number, userId: number, userIds: number[]) {
    await this.checkAdminAccess(userId, groupId);

    const addedMembers = [];
    for (const targetUserId of userIds) {
      const existingMembership = await this.storage.getConversationMembership(targetUserId, groupId);
      if (!existingMembership) {
        await this.storage.addConversationMember(targetUserId, groupId, 'member');
        addedMembers.push(targetUserId);
      }
    }

    return { addedMembers };
  }

  async removeMember(groupId: number, userId: number, memberId: number) {
    await this.checkAdminAccess(userId, groupId);

    if (memberId === userId) {
      throw new Error('Cannot remove yourself');
    }

    await this.storage.removeConversationMember(memberId, groupId);
    return { removedMemberId: memberId };
  }

  async updateMemberRole(groupId: number, userId: number, memberId: number, role: string) {
    await this.checkAdminAccess(userId, groupId);

    if (memberId === userId) {
      throw new Error('Cannot change your own role');
    }

    await this.storage.updateConversationMemberRole(memberId, groupId, role);
    return { memberId, newRole: role };
  }
}
