import { Request, Response } from 'express';
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

      return res.status(201).json({
        success: true,
        file: {
          url: fileUrl,
          name: displayFileName,
          type: attachmentType,
          size: file.size,
          mimetype: file.mimetype
        }
      });
    } catch (error) {
      console.error('Error saat upload file:', error);
      return res.status(500).json({ message: 'Gagal mengupload file' });
    }
  };
}
