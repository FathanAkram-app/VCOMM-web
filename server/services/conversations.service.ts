import { IStorage } from '../storage';
import { Conversation, InsertConversation, ConversationMember, InsertConversationMember } from '@shared/schema';

export class ConversationsService {
  constructor(private storage: IStorage) {}

  async getUserConversations(userId: number): Promise<Conversation[]> {
    return await this.storage.getUserConversations(userId);
  }

  async getConversationById(conversationId: number): Promise<Conversation | undefined> {
    return await this.storage.getConversation(conversationId);
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    return await this.storage.createConversation(data);
  }

  async createDirectChat(currentUserId: number, otherUserId: number): Promise<Conversation> {
    // Check if direct chat already exists
    const existingConversations = await this.storage.getUserConversations(currentUserId);

    for (const conv of existingConversations) {
      if (!conv.isGroup) {
        const members = await this.storage.getConversationMembers(conv.id);
        const memberIds = members.map(m => m.userId);

        if (memberIds.includes(currentUserId) && memberIds.includes(otherUserId) && memberIds.length === 2) {
          return conv;
        }
      }
    }

    // Create new direct chat
    const conversation = await this.storage.createConversation({
      name: `Direct Chat ${currentUserId}-${otherUserId}`,
      isGroup: false,
      createdById: currentUserId,
    });

    // Add members
    await this.storage.addConversationMember(currentUserId, conversation.id, 'member');
    await this.storage.addConversationMember(otherUserId, conversation.id, 'member');

    return conversation;
  }

  async deleteConversation(conversationId: number): Promise<void> {
    await this.storage.deleteConversation(conversationId);
  }

  async clearConversationMessages(conversationId: number): Promise<void> {
    await this.storage.clearConversationMessages(conversationId);
  }

  async hideConversation(userId: number, conversationId: number): Promise<void> {
    const membership = await this.storage.getConversationMembership(userId, conversationId);

    if (membership) {
      await this.storage.updateConversationMemberVisibility(membership.id, true);
    }
  }

  async deleteConversationForUser(userId: number, conversationId: number): Promise<void> {
    // Get all messages in the conversation
    const result = await this.storage.getMessagesByConversationForUser(conversationId, userId);
    const messages = result.messages;

    // Mark each message as deleted for this user
    for (const message of messages) {
      await this.storage.deleteMessageForUser(message.id, userId);
    }

    // Hide the conversation from the user's list
    await this.hideConversation(userId, conversationId);
  }

  async markConversationAsRead(userId: number, conversationId: number): Promise<void> {
    await this.storage.markConversationMessagesAsRead(conversationId, userId);
  }

  // Conversation Members
  async getConversationMembers(conversationId: number): Promise<any[]> {
    return await this.storage.getConversationMembers(conversationId);
  }

  async addConversationMember(data: InsertConversationMember): Promise<ConversationMember> {
    return await this.storage.addMemberToConversation(data);
  }

  async getConversationMembership(userId: number, conversationId: number): Promise<ConversationMember | undefined> {
    return await this.storage.getConversationMembership(userId, conversationId);
  }

  // Helper methods
  formatConversations(conversations: Conversation[]): any[] {
    return conversations.map(conv => ({
      ...conv,
      type: conv.isGroup ? 'group' : 'direct'
    }));
  }

  filterGroupConversations(conversations: Conversation[]): Conversation[] {
    return conversations.filter(conv => conv.isGroup);
  }

  filterDirectChats(conversations: Conversation[]): Conversation[] {
    return conversations.filter(conv => !conv.isGroup);
  }
}
