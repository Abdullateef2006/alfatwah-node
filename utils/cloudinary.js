'use strict';
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dltgnmg1v',
  api_key: process.env.CLOUDINARY_API_KEY || '738298728812741',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'qDSbOPW-RIv3ujRIvPhh3LqBqgc',
});

/**
 * Uploads a local file to Cloudinary and deletes the local file afterwards.
 * @param {string} filePath - Absolute or relative path to the local file
 * @param {string} [folder='alfatwa'] - Folder in Cloudinary
 * @returns {Promise<string>} - The secure URL of the uploaded file
 */
const uploadFile = async (filePath, folder = 'alfatwa') => {
  if (!filePath) return null;
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      folder: folder,
    });
    // Remove local file after successful upload to save disk space
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Failed to delete local file ${filePath}:`, err);
    });
    return result.secure_url;
  } catch (error) {
    // Also cleanup local file in case of upload error
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Failed to delete local file ${filePath} after error:`, err);
    });
    throw error;
  }
};

/**
 * Deletes a file from Cloudinary using its URL.
 * @param {string} url - The full Cloudinary URL
 * @returns {Promise<void>}
 */
const deleteFromCloudinary = async (url) => {
  if (!url || !url.includes('cloudinary.com')) return;
  try {
    // Extract public_id and resource_type from Cloudinary URL
    // URL format: https://res.cloudinary.com/<cloud_name>/<resource_type>/upload/v<version>/<folder>/<public_id>.<ext>
    const parts = url.split('/upload/');
    if (parts.length < 2) return;

    const pathAfterUpload = parts[1];
    // Remove version path segment (e.g. v12345678/)
    const pathWithoutVersion = pathAfterUpload.replace(/^v\d+\//, '');

    // Remove the file extension
    const lastDotIndex = pathWithoutVersion.lastIndexOf('.');
    const publicId = lastDotIndex !== -1 ? pathWithoutVersion.substring(0, lastDotIndex) : pathWithoutVersion;

    // Detect resource_type from the URL (e.g. image, video, raw)
    let resourceType = 'image';
    const beforeUploadParts = parts[0].split('/');
    if (beforeUploadParts.length > 0) {
      const type = beforeUploadParts[beforeUploadParts.length - 1];
      if (['image', 'video', 'raw'].includes(type)) {
        resourceType = type;
      }
    }

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`Successfully deleted from Cloudinary: ${publicId} (type: ${resourceType})`);
  } catch (error) {
    console.error(`Failed to delete resource ${url} from Cloudinary:`, error);
  }
};

/**
 * Generates a signed upload signature for client-side direct uploads.
 * @param {object} paramsToSign - Parameters to sign
 * @returns {string} - The signature
 */
const generateSignature = (paramsToSign) => {
  return cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET || 'qDSbOPW-RIv3ujRIvPhh3LqBqgc');
};

module.exports = {
  cloudinary,
  uploadFile,
  deleteFromCloudinary,
  generateSignature,
};
