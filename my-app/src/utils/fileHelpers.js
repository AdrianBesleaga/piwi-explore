/**
 * Supported file types map
 */
const SUPPORTED_TYPES = {
    'application/pdf': 'pdf',
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/webp': 'image',
    'text/plain': 'text'
};

/**
 * Detect file type category
 * @param {File} file 
 * @returns {'pdf' | 'image' | 'text' | null}
 */
export const detectFileType = (file) => {
    if (!file) return null;

    // Check MIME type first
    if (SUPPORTED_TYPES[file.type]) {
        return SUPPORTED_TYPES[file.type];
    }

    // Fallback to extension check
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'image';
    if (extension === 'txt') return 'text';

    return null;
};

/**
 * Format file size bytes to human readable string
 * @param {number} bytes 
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
