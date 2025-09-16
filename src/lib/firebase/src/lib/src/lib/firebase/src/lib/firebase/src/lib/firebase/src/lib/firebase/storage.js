// Firebase Cloud Storage operations
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata,
} from 'firebase/storage';
import { storage } from './config';

// Upload file with progress tracking
export const uploadFile = async (file, path, onProgress = null) => {
  try {
    // Validate file
    const validationResult = validateFile(file);
    if (!validationResult.isValid) {
      return { success: false, error: validationResult.error };
    }

    const storageRef = ref(storage, path);
    
    if (onProgress) {
      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject({ success: false, error: error.message });
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const metadata = await getMetadata(uploadTask.snapshot.ref);
              
              resolve({
                success: true,
                url: downloadURL,
                metadata: {
                  name: metadata.name,
                  size: metadata.size,
                  contentType: metadata.contentType,
                  timeCreated: metadata.timeCreated,
                  fullPath: metadata.fullPath,
                }
              });
            } catch (error) {
              reject({ success: false, error: error.message });
            }
          }
        );
      });
    } else {
      // Simple upload without progress
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const metadata = await getMetadata(snapshot.ref);
      
      return {
        success: true,
        url: downloadURL,
        metadata: {
          name: metadata.name,
          size: metadata.size,
          contentType: metadata.contentType,
          timeCreated: metadata.timeCreated,
          fullPath: metadata.fullPath,
        }
      };
    }
  } catch (error) {
    console.error('File upload error:', error);
    return { success: false, error: error.message };
  }
};

// Upload bank statement
export const uploadStatement = async (file, userId, onProgress = null) => {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const path = `statements/${userId}/${fileName}`;
  
  return await uploadFile(file, path, onProgress);
};

// Delete file from storage
export const deleteFile = async (filePath) => {
  try {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    console.error('File deletion error:', error);
    return { success: false, error: error.message };
  }
};

// Get file download URL
export const getFileURL = async (filePath) => {
  try {
    const storageRef = ref(storage, filePath);
    const url = await getDownloadURL(storageRef);
    return { success: true, url };
  } catch (error) {
    console.error('Error getting file URL:', error);
    return { success: false, error: error.message };
  }
};

// Get file metadata
export const getFileMetadata = async (filePath) => {
  try {
    const storageRef = ref(storage, filePath);
    const metadata = await getMetadata(storageRef);
    return { 
      success: true, 
      metadata: {
        name: metadata.name,
        size: metadata.size,
        contentType: metadata.contentType,
        timeCreated: metadata.timeCreated,
        fullPath: metadata.fullPath,
      }
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return { success: false, error: error.message };
  }
};

// Validate file before upload
export const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: 'File size must be less than 10MB' 
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'File type not supported. Please upload PDF, JPEG, PNG, or WebP files.' 
    };
  }

  return { isValid: true };
};

// Generate unique file path
export const generateFilePath = (userId, fileType, originalName) => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;
  
  const pathMap = {
    statement: `statements/${userId}/${fileName}`,
    export: `exports/${userId}/${fileName}`,
    profile: `profiles/${userId}/${fileName}`,
  };

  return pathMap[fileType] || `misc/${userId}/${fileName}`;
};

// Batch delete files
export const deleteFiles = async (filePaths) => {
  try {
    const deletePromises = filePaths.map(path => deleteFile(path));
    const results = await Promise.allSettled(deletePromises);
    
    const successful = results.filter(result => result.status === 'fulfilled' && result.value.success);
    const failed = results.filter(result => result.status === 'rejected' || !result.value.success);
    
    return {
      success: true,
      results: {
        successful: successful.length,
        failed: failed.length,
        total: filePaths.length
      }
    };
  } catch (error) {
    console.error('Batch delete error:', error);
    return { success: false, error: error.message };
  }
};
