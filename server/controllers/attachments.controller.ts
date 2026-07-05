import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AttachmentsService } from '../services/attachments.service';
import { getAttachmentType } from '../uploads';

export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  uploadFile = async (req: any, res: Response): Promise<Response | void> => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diupload' });
      }

      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Tidak terautentikasi' });
      }

      const file = req.file;
      const fileUrl = `/uploads/${file.filename}`;
      const attachmentType = getAttachmentType(file.mimetype);

      // Format audio file names with user info
      const displayFileName = await this.attachmentsService.formatAudioFileName(
        userId,
        file.originalname,
        attachmentType
      );

      // Include video thumbnail URL if generated (#11)
      const thumbnailUrl = (req as any).videoThumbnailUrl || null;

      return res.status(201).json({
        success: true,
        file: {
          url: fileUrl,
          name: displayFileName,
          type: attachmentType,
          size: file.size,
          mimetype: file.mimetype,
          thumbnailUrl,
        }
      });
    } catch (error) {
      console.error('Error saat upload file:', error);
      return res.status(500).json({ message: 'Gagal mengupload file' });
    }
  };

  /** Download with original filename (#13) */
  downloadFile = async (req: any, res: Response): Promise<Response | void> => {
    try {
      const { filename } = req.params;
      const originalName = req.query.name as string;

      const filePath = path.join(process.cwd(), 'uploads', filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      const downloadName = originalName || filename;
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
      return res.sendFile(filePath);
    } catch (error) {
      console.error('Error downloading file:', error);
      return res.status(500).json({ message: 'Failed to download file' });
    }
  };
}
