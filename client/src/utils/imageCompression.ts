import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File, maxSizeMB: number = 1): Promise<File> => {
  const options = {
    maxSizeMB: maxSizeMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg', // Convert to JPEG for better compression
    initialQuality: 0.8,
  };

  try {
    console.log('Original file size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');
    
    const compressedFile = await imageCompression(file, options);
    
    console.log('Compressed file size:', (compressedFile.size / (1024 * 1024)).toFixed(2), 'MB');
    
    // Rename the compressed file to maintain original name but with compression indicator
    const newFile = new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
    
    return newFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Gagal mengkompresi gambar');
  }
};

export const shouldCompressImage = (file: File): boolean => {
  const maxSize = 1 * 1024 * 1024; // 1MB
  return file.size > maxSize && file.type.startsWith('image/');
};