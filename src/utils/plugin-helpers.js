/**
 * Plugin Helper Utilities
 * Contains helper functions for the main plugin logic
 */

/**
 * Determine if an error represents a critical file validation failure
 * @param {Error} error - Error to classify
 * @returns {boolean} True if critical error
 */
export function isCriticalFileError(error) {
  return error.message.includes('File contents is not a Buffer') || 
         error.message.includes('File object is null');
}

/**
 * Determine if async processing should be applied
 * @param {Object} options - Processing options
 * @returns {boolean} True if async processing enabled
 */
export function shouldProcessAsync(options) {
  return options.async === true;
}

/**
 * Auto-discover section types from all files
 * @param {Object} files - Metalsmith files object
 * @param {Array} filesToProcess - List of files to analyze
 * @param {Object} options - Plugin options
 * @returns {Set} Discovered section types
 */
export function discoverSectionTypes(files, filesToProcess, options) {
  const discoveredTypes = new Set();
  
  for (const filename of filesToProcess) {
    const file = files[filename];
    const sectionsArray = file[options.sectionsField];
    
    if (Array.isArray(sectionsArray)) {
      sectionsArray.forEach(section => {
        const sectionType = section[options.sectionTypeField];
        if (sectionType && typeof sectionType === 'string') {
          discoveredTypes.add(sectionType);
        }
      });
    }
  }
  
  // Always include 'traditional' for long-form content
  discoveredTypes.add('traditional');
  
  return discoveredTypes;
}

/**
 * Generate component field mappings for discovered section types
 * @param {Set} sectionTypes - Discovered section types
 * @returns {Object} Component field mappings
 */
export function generateComponentFields(sectionTypes) {
  const componentFields = {};
  
  for (const type of sectionTypes) {
    if (type === 'traditional') {
      componentFields[type] = ['content'];
    } else {
      // Default fields that most components might have
      componentFields[type] = ['title', 'subTitle', 'leadIn', 'prose', 'caption', 'altText'];
    }
  }
  
  return componentFields;
}