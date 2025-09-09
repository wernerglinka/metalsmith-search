/**
 * File filtering utilities for performance optimization
 * Filters files before expensive content processing
 */

/**
 * Check if file has searchable content
 * @param {Object} file - Metalsmith file object
 * @param {string} filename - File name
 * @returns {boolean} True if file has searchable content
 */
function hasSearchableContent(file, filename, options = {}) {
  // Must have contents buffer
  if (!Buffer.isBuffer(file.contents)) {
    return false;
  }
  
  // For component-based pages: check for structured content even if contents is empty
  if (hasStructuredContent(file, options)) {
    return true;
  }
  
  // Skip empty files that don't have structured content
  if (file.contents.length === 0) {
    return false;
  }
  
  // Skip binary files (simple heuristic)
  if (isBinaryFile(file.contents, filename)) {
    return false;
  }
  
  return true;
}

/**
 * Check if file is likely binary (performance optimization)
 * @param {Buffer} contents - File contents
 * @param {string} filename - File name for extension check
 * @returns {boolean} True if likely binary
 */
function isBinaryFile(contents, filename) {
  // Check file extension first (fastest check)
  const binaryExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.exe', '.dll', '.so', '.dylib', '.app'
  ];
  
  const ext = filename.toLowerCase().split('.').pop();
  if (binaryExtensions.includes(`.${ext}`)) {
    return true;
  }
  
  // Quick binary check: look for null bytes in first 512 bytes
  const sample = contents.subarray(0, Math.min(512, contents.length));
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if file has structured content (frontmatter)
 * @param {Object} file - Metalsmith file object
 * @param {Object} options - Configuration options (optional)
 * @returns {boolean} True if has frontmatter or structured content
 */
function hasStructuredContent(file, options = {}) {
  // Check for common frontmatter fields
  const contentFields = ['title', 'description', 'summary', 'excerpt', 'content'];
  const hasContentFields = contentFields.some(field => file[field]);
  
  if (hasContentFields) {
    return true;
  }
  
  // Check for component arrays (configurable field name)
  const sectionsField = options.sectionsField || 'sections';
  if (Array.isArray(file[sectionsField]) && file[sectionsField].length > 0) {
    return true;
  }
  
  // Check if contents starts with frontmatter delimiter
  if (Buffer.isBuffer(file.contents)) {
    const content = file.contents.toString('utf8', 0, 100); // First 100 chars
    if (content.startsWith('---\n') || content.startsWith('---\r\n')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get file priority for processing order
 * Higher numbers = higher priority
 * @param {Object} file - Metalsmith file object
 * @param {string} filename - File name
 * @returns {number} Priority score
 */
function getFilePriority(file, filename, options = {}) {
  let priority = 0;
  
  // Prioritize structured content
  if (hasStructuredContent(file, options)) {
    priority += 10;
  }
  
  // Prioritize by file type
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'md':
    case 'markdown':
      priority += 5;
      break;
    case 'html':
    case 'htm':
      priority += 3;
      break;
    case 'txt':
      priority += 1;
      break;
  }
  
  // Prioritize files with more content
  if (Buffer.isBuffer(file.contents)) {
    const contentLength = file.contents.length;
    if (contentLength > 5000) {priority += 3;}
    else if (contentLength > 1000) {priority += 2;}
    else if (contentLength > 100) {priority += 1;}
  }
  
  return priority;
}

/**
 * Filter and sort files for optimal processing
 * @param {Object} files - Metalsmith files object
 * @param {Array} filenames - Array of filenames to filter
 * @param {Object} options - Processing options
 * @returns {Array} Filtered and sorted filenames
 */
export function filterAndSortFiles(files, filenames, options = {}) {
  const filteredFiles = [];
  
  // First pass: filter out unsuitable files
  for (const filename of filenames) {
    const file = files[filename];
    
    if (hasSearchableContent(file, filename, options)) {
      filteredFiles.push({
        filename,
        priority: getFilePriority(file, filename, options),
        hasStructured: hasStructuredContent(file, options)
      });
    }
  }
  
  // Sort by priority (highest first) for optimal processing order
  if (options.prioritizeProcessing !== false) {
    filteredFiles.sort((a, b) => b.priority - a.priority);
  }
  
  return filteredFiles.map(item => item.filename);
}

/**
 * Quick validation of file before processing
 * @param {Object} file - Metalsmith file object
 * @param {string} filename - File name
 * @returns {Object} Validation result with details
 */
export function validateFileForSearch(file, filename, options = {}) {
  const issues = [];
  
  if (!file) {
    return { valid: false, issues: ['File object is null'], canProcess: false };
  }
  
  if (!Buffer.isBuffer(file.contents)) {
    issues.push('File contents is not a Buffer');
    return { valid: false, issues, canProcess: false };
  }
  
  const hasStructured = hasStructuredContent(file, options);
  
  if (file.contents.length === 0 && !hasStructured) {
    issues.push('File is empty and has no structured content');
    return { valid: false, issues, canProcess: false };
  }
  
  if (isBinaryFile(file.contents, filename)) {
    issues.push('File appears to be binary');
    return { valid: false, issues, canProcess: false };
  }
  
  if (!hasStructured) {
    issues.push('No structured content detected');
  }
  
  return {
    valid: true,
    issues: issues.length > 0 ? issues : null,
    canProcess: true,
    hasStructuredContent: hasStructured,
    priority: getFilePriority(file, filename, options)
  };
}

// Export utility functions for testing
export { hasSearchableContent, hasStructuredContent, isBinaryFile, getFilePriority };