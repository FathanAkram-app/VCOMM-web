import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';

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

// Server-side image compression utility
export const compressImageServer = async (
  inputPath: string, 
  outputPath: string, 
  maxSizeKB: number = 1024
): Promise<{ success: boolean; originalSize: number; compressedSize: number; path: string }> => {
  try {
    const originalStats = fs.statSync(inputPath);
    
    // Start with 80% quality
    let quality = 80;
    let compressedBuffer: Buffer;
    
    do {
      compressedBuffer = await sharp(inputPath)
        .resize(1920, 1080, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: quality,
          progressive: true,
          mozjpeg: true 
        })
        .toBuffer();
      
      // If still too large, reduce quality
      if (compressedBuffer.length > maxSizeKB * 1024 && quality > 20) {
        quality -= 10;
      } else {
        break;
      }
    } while (quality > 20);
    
    // Write the compressed image
    await sharp(compressedBuffer).toFile(outputPath);
    
    return {
      success: true,
      originalSize: originalStats.size,
      compressedSize: compressedBuffer.length,
      path: outputPath
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    return {
      success: false,
      originalSize: 0,
      compressedSize: 0,
      path: inputPath
    };
  }
};

export const shouldCompressImageServer = async (filePath: string): Promise<boolean> => {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeKB = stats.size / 1024;
    return fileSizeKB > 1024; // Compress if larger than 1MB
  } catch (error) {
    return false;
  }
};

// Middleware untuk kompresi gambar setelah upload
export const compressUploadedImage = async (req: any, res: any, next: any) => {
  if (!req.file || !req.file.mimetype.startsWith('image/')) {
    return next();
  }

  try {
    const filePath = req.file.path;
    const shouldCompress = await shouldCompressImageServer(filePath);
    
    if (shouldCompress) {
      console.log('Compressing image:', req.file.filename);
      
      const compressedFilename = `compressed_${req.file.filename.replace(path.extname(req.file.filename), '.jpg')}`;
      const compressedPath = path.join('./uploads', compressedFilename);
      
      const result = await compressImageServer(filePath, compressedPath, 1024);
      
      if (result.success) {
        // Delete original file and update req.file to point to compressed version
        fs.unlinkSync(filePath);
        req.file.filename = compressedFilename;
        req.file.path = compressedPath;
        req.file.mimetype = 'image/jpeg';
        
        console.log(`Image compressed: ${(result.originalSize / 1024).toFixed(2)}KB -> ${(result.compressedSize / 1024).toFixed(2)}KB`);
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in image compression middleware:', error);
    next(); // Continue without compression if error occurs
  }
};