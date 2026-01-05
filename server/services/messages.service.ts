import { IStorage } from '../storage';
import { InsertMessage, Message } from '@shared/schema';

export class MessagesService {
  constructor(private storage: IStorage) {}

  async sendMessage(data: InsertMessage): Promise<Message> {
    return await this.storage.createMessage(data);
  }

  async getConversationMessages(
    conversationId: number,
    userId: number,
    limit?: number,
    offset?: number
  ): Promise<{ messages: Message[]; total: number; hasMore: boolean }> {
    return await this.storage.getMessagesByConversationForUser(conversationId, userId, limit, offset);
  }

  async deleteMessage(messageId: number, userId: number, deleteForEveryone: boolean): Promise<void> {
    if (deleteForEveryone) {
      await this.storage.deleteMessage(messageId);
    } else {
      await this.storage.deleteMessageForUser(messageId, userId);
    }
  }

  async forwardMessage(messageId: number, targetConversationIds: number[], userId: number): Promise<Message[]> {
    const forwardedMessages: Message[] = [];

    for (const targetId of targetConversationIds) {
      const message = await this.storage.forwardMessage(messageId, targetId, userId);
      forwardedMessages.push(message);
    }

    return forwardedMessages;
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await this.storage.markMessageAsRead(messageId);
  }

  async getConversationMembers(conversationId: number): Promise<any[]> {
    return await this.storage.getConversationMembers(conversationId);
  }

  async getUser(userId: number) {
    return await this.storage.getUser(userId);
  }

  async getConversation(conversationId: number) {
    return await this.storage.getConversation(conversationId);
  }

  async isUserOnline(userId: number): Promise<boolean> {
    return await this.storage.isUserOnline(userId);
  }
}
