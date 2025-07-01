import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

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

// Size limits based on file type - Increased limits for compression handling
const fileSizeLimits = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const maxSize = 10 * 1024 * 1024; // Default 10MB
  
  if (file.mimetype.startsWith('image/')) {
    // Image: max 10MB (will be compressed if >1MB)
    if (req.file?.size > 10 * 1024 * 1024) {
      cb(new Error('Ukuran gambar maksimum 10MB'));
    }
  } else if (file.mimetype.startsWith('video/')) {
    // Video: max 100MB (will be compressed if >20MB)
    if (req.file?.size > 100 * 1024 * 1024) {
      cb(new Error('Ukuran video maksimum 100MB'));
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
    fileSize: 100 * 1024 * 1024 // Max 100MB (will be further restricted by file type)
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

// Video compression utility
export const compressVideoServer = async (
  inputPath: string,
  outputPath: string,
  maxSizeMB: number = 20
): Promise<{ success: boolean; originalSize: number; compressedSize: number; path: string }> => {
  return new Promise((resolve) => {
    try {
      const originalStats = fs.statSync(inputPath);
      
      // First, get video info to determine orientation
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          console.error('Error getting video metadata:', err);
          resolve({
            success: false,
            originalSize: originalStats.size,
            compressedSize: 0,
            path: inputPath
          });
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          console.error('No video stream found');
          resolve({
            success: false,
            originalSize: originalStats.size,
            compressedSize: 0,
            path: inputPath
          });
          return;
        }

        const width = videoStream.width || 720;
        const height = videoStream.height || 1280;
        const isPortrait = height > width;
        
        console.log(`[COMPRESSION] Original video: ${width}x${height}, Portrait: ${isPortrait}`);
        
        // Set compression parameters based on orientation
        let targetWidth, targetHeight;
        if (isPortrait) {
          // Portrait video: limit height, maintain aspect ratio
          targetHeight = Math.min(height, 1280);
          targetWidth = Math.round((width / height) * targetHeight);
          // Ensure even numbers for encoding
          if (targetWidth % 2 !== 0) targetWidth--;
          if (targetHeight % 2 !== 0) targetHeight--;
        } else {
          // Landscape video: limit width, maintain aspect ratio
          targetWidth = Math.min(width, 1280);
          targetHeight = Math.round((height / width) * targetWidth);
          // Ensure even numbers for encoding
          if (targetWidth % 2 !== 0) targetWidth--;
          if (targetHeight % 2 !== 0) targetHeight--;
        }
        
        console.log(`[COMPRESSION] Target resolution: ${targetWidth}x${targetHeight}`);
        
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .videoBitrate('800k')  // 800kbps video bitrate
          .audioBitrate('128k')  // 128kbps audio bitrate
          .size(`${targetWidth}x${targetHeight}`)  // Maintain aspect ratio
          .fps(30)               // 30 FPS
          .format('mp4')
          .outputOptions([
            '-preset fast',      // Faster encoding
            '-crf 28',          // Quality setting (lower = better quality)
            '-movflags +faststart' // Optimize for streaming
          ])
          .on('end', () => {
            try {
              const compressedStats = fs.statSync(outputPath);
              console.log(`[COMPRESSION] Video compression completed: ${targetWidth}x${targetHeight}`);
              resolve({
                success: true,
                originalSize: originalStats.size,
                compressedSize: compressedStats.size,
                path: outputPath
              });
            } catch (error) {
              console.error('Error reading compressed video stats:', error);
              resolve({
                success: false,
                originalSize: originalStats.size,
                compressedSize: 0,
                path: inputPath
              });
            }
          })
          .on('error', (error) => {
            console.error('Error compressing video:', error);
            resolve({
              success: false,
              originalSize: originalStats.size,
              compressedSize: 0,
              path: inputPath
            });
          })
          .save(outputPath);
      });
    } catch (error) {
      console.error('Error in video compression setup:', error);
      const originalStats = fs.statSync(inputPath);
      resolve({
        success: false,
        originalSize: originalStats.size,
        compressedSize: 0,
        path: inputPath
      });
    }
  });
};

export const shouldCompressVideoServer = async (filePath: string): Promise<boolean> => {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    return fileSizeMB > 20; // Compress if larger than 20MB
  } catch (error) {
    return false;
  }
};

// Middleware untuk kompresi media setelah upload
export const compressUploadedMedia = async (req: any, res: any, next: any) => {
  if (!req.file) {
    return next();
  }

  try {
    const filePath = req.file.path;
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    
    console.log(`[COMPRESSION] Processing file: ${req.file.filename}`);
    console.log(`[COMPRESSION] File type: ${req.file.mimetype}`);
    console.log(`[COMPRESSION] File size: ${fileSizeMB.toFixed(2)}MB`);
    
    // Handle image compression
    if (req.file.mimetype.startsWith('image/')) {
      const shouldCompress = await shouldCompressImageServer(filePath);
      console.log(`[COMPRESSION] Image should compress: ${shouldCompress}`);
      
      if (shouldCompress) {
        console.log('[COMPRESSION] Starting image compression...');
        
        const compressedFilename = `compressed_${req.file.filename.replace(path.extname(req.file.filename), '.jpg')}`;
        const compressedPath = path.join('./uploads', compressedFilename);
        
        const result = await compressImageServer(filePath, compressedPath, 1024);
        
        if (result.success) {
          // Delete original file and update req.file to point to compressed version
          fs.unlinkSync(filePath);
          req.file.filename = compressedFilename;
          req.file.path = compressedPath;
          req.file.mimetype = 'image/jpeg';
          req.file.size = result.compressedSize; // Update file size to compressed size
          
          console.log(`[COMPRESSION] Image compressed successfully: ${(result.originalSize / 1024).toFixed(2)}KB -> ${(result.compressedSize / 1024).toFixed(2)}KB`);
        } else {
          console.log('[COMPRESSION] Image compression failed, using original file');
        }
      }
    }
    
    // Handle video compression
    else if (req.file.mimetype.startsWith('video/')) {
      const shouldCompress = await shouldCompressVideoServer(filePath);
      console.log(`[COMPRESSION] Video should compress: ${shouldCompress} (size: ${fileSizeMB.toFixed(2)}MB, threshold: 20MB)`);
      
      if (shouldCompress) {
        console.log('[COMPRESSION] Starting video compression...');
        
        const compressedFilename = `compressed_${req.file.filename.replace(path.extname(req.file.filename), '.mp4')}`;
        const compressedPath = path.join('./uploads', compressedFilename);
        
        const result = await compressVideoServer(filePath, compressedPath, 20);
        
        if (result.success) {
          // Delete original file and update req.file to point to compressed version
          fs.unlinkSync(filePath);
          req.file.filename = compressedFilename;
          req.file.path = compressedPath;
          req.file.mimetype = 'video/mp4';
          req.file.size = result.compressedSize; // Update file size to compressed size
          
          console.log(`[COMPRESSION] Video compressed successfully: ${(result.originalSize / (1024 * 1024)).toFixed(2)}MB -> ${(result.compressedSize / (1024 * 1024)).toFixed(2)}MB`);
        } else {
          console.log('[COMPRESSION] Video compression failed, using original file');
        }
      }
    } else {
      console.log(`[COMPRESSION] File type ${req.file.mimetype} does not need compression`);
    }
    
    next();
  } catch (error) {
    console.error('[COMPRESSION] Error in media compression middleware:', error);
    next(); // Continue without compression if error occurs
  }
};

// Keep backward compatibility
export const compressUploadedImage = compressUploadedMedia;