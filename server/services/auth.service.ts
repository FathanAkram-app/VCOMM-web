import { IStorage } from '../storage';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { gotifyService } from './gotify.service';
import bcrypt from 'bcryptjs';

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

  /** Generate 6-digit OTP and send via Gotify (#1 Password Reset) */
  async requestPasswordReset(callsign: string): Promise<{ success: boolean; message: string }> {
    const [user] = await db.select().from(users).where(eq(users.callsign, callsign));
    if (!user) {
      // Don't reveal whether the user exists
      return { success: true, message: 'If the callsign exists, a reset code has been sent.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.update(users)
      .set({ resetToken: otp, resetTokenExpiry: expiry })
      .where(eq(users.id, user.id));

    // Send OTP via Gotify
    try {
      const userToken = await this.storage.getUserGotifyToken(user.id);
      if (userToken) {
        await gotifyService.sendCallNotification(
          userToken,
          `reset_${user.id}`,
          'system',
          'VCOMM Security',
          'audio',
          false
        );
      }
      // Also send as a message notification
      await gotifyService.sendMessageNotification(
        user.id,
        'VCOMM Security',
        `Your password reset code is: ${otp}. It expires in 10 minutes.`,
        0
      );
    } catch (err) {
      console.error('[Auth] Error sending reset OTP via Gotify:', err);
    }

    console.log(`[Auth] Password reset OTP generated for user ${user.id}`);
    return { success: true, message: 'If the callsign exists, a reset code has been sent.' };
  }

  /** Verify OTP and return a temp reset token */
  async verifyResetToken(callsign: string, otp: string): Promise<{ success: boolean; tempToken?: string; message?: string }> {
    const [user] = await db.select().from(users)
      .where(
        and(
          eq(users.callsign, callsign),
          eq(users.resetToken, otp),
          gt(users.resetTokenExpiry, new Date())
        )
      );

    if (!user) {
      return { success: false, message: 'Invalid or expired reset code.' };
    }

    // Generate a temporary token for the reset
    const tempToken = `reset_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Clear the OTP (single-use)
    await db.update(users)
      .set({ resetToken: tempToken, resetTokenExpiry: new Date(Date.now() + 5 * 60 * 1000) })
      .where(eq(users.id, user.id));

    return { success: true, tempToken };
  }

  /** Reset password using the temp token */
  async resetPassword(tempToken: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    const [user] = await db.select().from(users)
      .where(
        and(
          eq(users.resetToken, tempToken),
          gt(users.resetTokenExpiry, new Date())
        )
      );

    if (!user) {
      return { success: false, message: 'Invalid or expired reset session.' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      })
      .where(eq(users.id, user.id));

    console.log(`[Auth] Password reset completed for user ${user.id}`);
    return { success: true, message: 'Password has been reset successfully.' };
  }

  /** Admin force-reset a user's password */
  async adminResetPassword(targetUserId: number, newPassword: string): Promise<{ success: boolean; message?: string }> {
    const [user] = await db.select().from(users).where(eq(users.id, targetUserId));
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({ password: hashedPassword, resetToken: null, resetTokenExpiry: null })
      .where(eq(users.id, targetUserId));

    console.log(`[Auth] Admin reset password for user ${targetUserId}`);
    return { success: true, message: 'Password has been reset.' };
  }
}
