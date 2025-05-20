import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Pastikan folder uploads ada
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Membuat nama file yang unik dengan UUID untuk mencegah konflik nama file
    const uniqueSuffix = randomUUID();
    const fileExtension = path.extname(file.originalname);
    cb(null, uniqueSuffix + fileExtension);
  }
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Hanya menerima file dengan tipe yang sesuai
  const allowedTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    // Format Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/*', // Menerima semua jenis audio
    // Format Video
    'video/mp4',
    'video/mpeg',
    'video/webm',
    'video/ogg'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung'));
  }
};

// Size limits based on file type
const fileSizeLimits = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const maxSize = 10 * 1024 * 1024; // Default 10MB
  
  if (file.mimetype.startsWith('image/')) {
    // Image: max 5MB
    if (req.file?.size > 5 * 1024 * 1024) {
      cb(new Error('Ukuran gambar maksimum 5MB'));
    }
  } else if (file.mimetype.startsWith('video/')) {
    // Video: max 50MB
    if (req.file?.size > 50 * 1024 * 1024) {
      cb(new Error('Ukuran video maksimum 50MB'));
    }
  } else if (file.mimetype.startsWith('audio/')) {
    // Audio: max 20MB
    if (req.file?.size > 20 * 1024 * 1024) {
      cb(new Error('Ukuran audio maksimum 20MB'));
    }
  } else {
    // Documents: max 10MB
    if (req.file?.size > maxSize) {
      cb(new Error('Ukuran file maksimum 10MB'));
    }
  }
  
  cb(null, true);
};

// Setup multer middleware
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // Max 50MB (will be further restricted by file type)
  }
});

// Helper function to get attachment type from mimetype
export function getAttachmentType(mimetype: string): string {
  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (mimetype.startsWith('audio/')) {
    return 'audio';
  } else {
    return 'document';
  }
}

// Error handler middleware for multer
export function handleUploadError(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Ukuran file terlalu besar' });
    }
    return res.status(400).json({ message: `Error upload: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
}

// Function to delete file if needed
export function deleteFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error saat menghapus file:', error);
  }
}