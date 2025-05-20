import { db } from './db';
import { messages } from '@shared/schema';
import { lt, eq, isNull, and, not } from 'drizzle-orm';
import { log } from './vite';

// Default expiration times in days per classification type
const DEFAULT_EXPIRATION_DAYS = {
  routine: 30,   // Regular messages expire after 30 days
  sensitive: 7,  // Sensitive messages expire after 7 days
  classified: 3  // Classified messages expire after 3 days
};

/**
 * Calculates the expiration date for a message based on its classification
 * @param classification The message classification type
 * @returns A Date object representing when the message should expire
 */
export function calculateExpirationDate(classification: string = 'routine'): Date {
  const days = DEFAULT_EXPIRATION_DAYS[classification as keyof typeof DEFAULT_EXPIRATION_DAYS] || 
               DEFAULT_EXPIRATION_DAYS.routine;
  
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate;
}

/**
 * Marks expired messages as deleted (soft delete)
 * @returns Number of messages that were deleted
 */
export async function processExpiredMessages(): Promise<number> {
  const now = new Date();
  
  try {
    // Find messages that should be expired but aren't marked as deleted yet
    const result = await db
      .update(messages)
      .set({ isDeleted: true })
      .where(
        and(
          lt(messages.expiresAt as any, now),
          eq(messages.isDeleted, false),
          not(isNull(messages.expiresAt))
        )
      )
      .returning();
    
    const deletedCount = result.length;
    if (deletedCount > 0) {
      log(`Expired ${deletedCount} messages`, 'message-expiration');
    }
    
    return deletedCount;
  } catch (error) {
    log(`Error processing expired messages: ${error}`, 'message-expiration');
    return 0;
  }
}

/**
 * Permanently purges messages that have been soft-deleted for a certain period
 * @param daysToKeepDeleted Number of days to keep soft-deleted messages before permanent deletion
 * @returns Number of messages that were permanently deleted
 */
export async function purgeDeletedMessages(daysToKeepDeleted: number = 7): Promise<number> {
  const purgeDate = new Date();
  purgeDate.setDate(purgeDate.getDate() - daysToKeepDeleted);
  
  try {
    // Find soft-deleted messages older than the purge date
    const deletedMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.isDeleted, true),
          lt(messages.expiresAt as any, purgeDate)
        )
      );
    
    if (deletedMessages.length > 0) {
      // Permanently delete these messages
      await db
        .delete(messages)
        .where(
          and(
            eq(messages.isDeleted, true),
            lt(messages.expiresAt as any, purgeDate)
          )
        );
      
      log(`Permanently purged ${deletedMessages.length} deleted messages`, 'message-expiration');
      return deletedMessages.length;
    }
    
    return 0;
  } catch (error) {
    log(`Error purging deleted messages: ${error}`, 'message-expiration');
    return 0;
  }
}

/**
 * Schedules the message expiration and purging jobs
 */
export function scheduleMessageExpirationJobs(): void {
  // Check for expired messages every hour
  const expirationCheckInterval = 60 * 60 * 1000; // 1 hour
  
  // Purge permanently deleted messages once a day
  const purgeInterval = 24 * 60 * 60 * 1000; // 24 hours
  
  log('Starting message expiration service...', 'message-expiration');
  
  // Initial run
  processExpiredMessages();
  
  // Schedule recurring checks
  setInterval(async () => {
    await processExpiredMessages();
  }, expirationCheckInterval);
  
  // Schedule recurring purges
  setInterval(async () => {
    await purgeDeletedMessages();
  }, purgeInterval);
}