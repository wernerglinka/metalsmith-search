/**
 * Content extraction processor for search indexing
 * Handles modern component-based Metalsmith sites with multi-level indexing
 */
import { stripHtml } from '../utils/html-stripper.js';
import { generateAnchorId } from '../utils/anchor-generator.js';

/**
 * Extract searchable content from a Metalsmith file
 * Supports both traditional pages and modern component-based structures
 * 
 * @param {Object} file - Metalsmith file object
 * @param {string} filename - File path
 * @param {Object} options - Processing options
 * @param {Object} metalsmith - Metalsmith instance
 * @returns {Promise<Array>} Array of search entries
 */
export async function extractSearchableContent(file, filename, options, metalsmith) {
  const debug = metalsmith.debug('metalsmith-search:extractor');
  const entries = [];
  
  try {
    // Validate file input
    if (!file) {
      throw new Error(`File object is null for ${filename}`);
    }
    
    if (!Buffer.isBuffer(file.contents)) {
      throw new Error(`File contents is not a Buffer for ${filename}. Got: ${typeof file.contents}`);
    }
    
    // Always process frontmatter - skip content check entirely
    debug(`Processing file: ${filename}`);
    
    // Extract file properties safely
    const { contents, stats, ...fileMetadata } = file;
    
    // Generate base URL for this file
    const baseUrl = filename.replace(/\.md$|\.html$/, '').replace(/\/index$/, '') || '/';
    const cleanUrl = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
    
    debug(`Extracting content from ${filename} (URL: ${cleanUrl})`);
    
    // Determine page name for all entries (explicit pageTitle takes precedence)
    const pageName = file.pageTitle || 
                     file.seo?.title ||
                     file.title || 
                     'Untitled Page';
    
    // Extract page-level content if enabled
    if (options.indexLevels.includes('page')) {
      const pageEntry = await extractPageLevelContent(file, cleanUrl, options, pageName);
      if (pageEntry) {
        entries.push(pageEntry);
        debug(`Added page entry for ${filename}`);
      }
    }
    
    // Extract section-level content if enabled and component array exists
    const sectionsArray = file[options.sectionsField];
    if (options.indexLevels.includes('section') && Array.isArray(sectionsArray) && sectionsArray.length > 0) {
      // First, ensure all sections have IDs for template rendering
      ensureSectionIDs(sectionsArray, options);
      
      const sectionEntries = await extractSectionLevelContent(
        sectionsArray, 
        cleanUrl, 
        options,
        pageName
      );
      entries.push(...sectionEntries);
      debug(`Added ${sectionEntries.length} component section entries for ${filename} (field: ${options.sectionsField})`);
    }
    
    // Extract traditional content sections (paragraphs/headings) if enabled
    if (options.indexLevels.includes('section') && !sectionsArray && file.contents) {
      const traditionalSections = await extractTraditionalSections(file, cleanUrl, options, pageName);
      entries.push(...traditionalSections);
      debug(`Added ${traditionalSections.length} traditional section entries for ${filename}`);
    }
    
    // Extract component-level content if enabled and components exist
    if (options.indexLevels.includes('component')) {
      const componentEntries = await extractComponentLevelContent(file, cleanUrl, options, pageName);
      entries.push(...componentEntries);
      debug(`Added ${componentEntries.length} component entries for ${filename}`);
    }
    
    debug(`Total entries extracted from ${filename}: ${entries.length}`);
    return entries;
    
  } catch (error) {
    debug(`Error extracting content from ${filename}:`, error);
    // Don't fail the entire process for one file
    return [];
  }
}

/**
 * Extract page-level searchable content
 * Handles both traditional pages and component-based pages
 * Processes markdown in frontmatter fields
 * @param {Object} file - Metalsmith file object
 * @param {string} url - Page URL
 * @param {Object} options - Processing options
 * @param {string} pageName - Name of the page for display
 * @returns {Promise<Object|null>} Page search entry
 */
async function extractPageLevelContent(file, url, options, pageName) {
  const content = {};
  
  // Extract and process basic metadata (handle markdown in frontmatter)
  if (file.title) {content.title = processMarkdownField(file.title, options);}
  if (file.description) {content.description = processMarkdownField(file.description, options);}
  if (file.excerpt) {content.excerpt = processMarkdownField(file.excerpt, options);}
  if (file.tags) {content.tags = Array.isArray(file.tags) ? file.tags : [file.tags];}
  if (file.date) {content.date = file.date;}
  if (file.author) {content.author = file.author;}
  
  // Extract additional frontmatter fields that might contain content
  const contentFields = ['summary', 'intro', 'leadIn', 'subTitle', 'abstract', 'overview'];
  for (const field of contentFields) {
    if (file[field]) {
      content[field] = processMarkdownField(file[field], options);
    }
  }
  
  // Extract main content only if exists and has meaningful content
  if (file.contents && file.contents.length > 0) {
    let mainContent = file.contents.toString().trim();
    
    // Only process if there's actual content (not just frontmatter delimiters)
    if (mainContent && mainContent !== '---' && !mainContent.match(/^---\s*$/)) {
      if (options.stripHtml) {
        mainContent = stripHtml(mainContent);
      }
      content.content = mainContent;
      
      // For traditional long-form content, create a shorter excerpt if not provided
      if (!content.excerpt && content.content.length > 300) {
        content.excerpt = `${content.content.substring(0, 250).replace(/\s+\S*$/, '')}...`;
      }
    }
  }
  
  // Create entry if we have ANY meaningful content (frontmatter OR contents)
  // Component-based pages have rich frontmatter but empty contents
  const hasFrontmatterContent = content.title || content.description || content.excerpt || 
                               content.summary || content.intro || content.abstract;
  const hasMainContent = content.content && content.content.length > 0;
  
  if (!hasFrontmatterContent && !hasMainContent) {
    return null;
  }
  
  // Combine all text content for full-text search
  const allContent = [
    content.content || '',
    content.description || '',
    content.excerpt || '',
    content.summary || '',
    content.intro || '',
    content.abstract || ''
  ].filter(Boolean).join(' ').trim();
  
  return {
    id: `page:${url}`,
    type: 'page',
    url,
    title: content.title || 'Untitled Page',
    pageName: pageName,
    description: content.description || '',
    content: allContent,
    excerpt: content.excerpt || '',
    tags: content.tags || [],
    date: content.date || null,
    author: content.author || null,
    wordCount: allContent.split(/\s+/).length,
    score: 0 // Will be set by Fuse.js
  };
}

/**
 * Extract section-level searchable content from component-based pages
 * @param {Array} sections - Page sections array
 * @param {string} baseUrl - Base page URL  
 * @param {Object} options - Processing options
 * @param {string} pageName - Name of the page for display
 * @returns {Promise<Array>} Section search entries
 */
async function extractSectionLevelContent(sections, baseUrl, options, pageName) {
  const entries = [];
  
  if (!Array.isArray(sections)) {
    return entries;
  }
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Skip disabled sections
    if (section.isDisabled) {
      continue;
    }
    
    const sectionContent = {};
    const sectionType = section.sectionType || 'unknown';
    
    // Extract content based on component type
    const fieldMap = options.componentFields[sectionType] || ['title', 'prose', 'leadIn'];
    
    for (const field of fieldMap) {
      const fieldContent = findNestedField(section, field);
      
      if (fieldContent && typeof fieldContent === 'string') {
        let processedContent = fieldContent;
        if (options.stripHtml) {
          processedContent = stripHtml(processedContent);
        }
        sectionContent[field] = processedContent.trim();
      }
    }
    
    // Use the section ID that was ensured to exist
    const anchorId = options.generateAnchors ? section.id : null;
    
    // Only create entry if we have content
    const hasContent = Object.values(sectionContent).some(value => value && value.length > 0);
    if (!hasContent) {
      continue;
    }
    
    const entry = {
      id: `section:${baseUrl}:${i}`,
      type: 'section',
      sectionType,
      url: anchorId ? `${baseUrl}#${anchorId}` : baseUrl,
      title: sectionContent.title || sectionContent.leadIn || `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} Section`,
      pageName: pageName,
      leadIn: sectionContent.leadIn || '',
      prose: sectionContent.prose || '',
      caption: sectionContent.caption || '',
      altText: sectionContent.altText || '',
      content: Object.values(sectionContent).join(' ').trim(),
      sectionIndex: i,
      score: 0 // Will be set by Fuse.js
    };
    
    entries.push(entry);
  }
  
  return entries;
}

/**
 * Extract traditional content sections from long-form markdown/HTML content
 * Splits content by headings and paragraphs for better search granularity
 * @param {Object} file - Metalsmith file object
 * @param {string} baseUrl - Base page URL
 * @param {Object} options - Processing options
 * @param {string} pageName - Name of the page for display
 * @returns {Promise<Array>} Traditional section entries
 */
async function extractTraditionalSections(file, baseUrl, options, pageName) {
  const entries = [];
  
  if (!file.contents) {
    return entries;
  }
  
  let content = file.contents.toString();
  
  // Strip HTML if enabled
  if (options.stripHtml) {
    content = stripHtml(content);
  }
  
  // Split content by headings (## or #) to create sections
  const sections = splitContentBySections(content);
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    if (!section.content || section.content.trim().length < 50) {
      continue; // Skip very short sections
    }
    
    // Generate anchor ID for the section
    let anchorId = null;
    if (options.generateAnchors && section.heading) {
      anchorId = generateAnchorId(section.heading);
    }
    
    const entry = {
      id: `section:${baseUrl}:traditional-${i}`,
      type: 'section',
      sectionType: 'traditional',
      url: anchorId ? `${baseUrl}#${anchorId}` : baseUrl,
      title: section.heading || `Section ${i + 1}`,
      pageName: pageName,
      content: section.content.trim(),
      sectionIndex: i,
      wordCount: section.content.split(/\s+/).length,
      score: 0 // Will be set by Fuse.js
    };
    
    entries.push(entry);
  }
  
  return entries;
}

/**
 * Split content into logical sections based on headings
 * @param {string} content - Content to split
 * @returns {Array} Array of section objects with heading and content
 */
function splitContentBySections(content) {
  const sections = [];
  
  // Split by markdown headings (# or ##) or HTML headings
  const headingRegex = /^(#{1,6}\s+.+|<h[1-6][^>]*>.*?<\/h[1-6]>)/gim;
  const parts = content.split(headingRegex);
  
  let currentHeading = null;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (!part || part.trim() === '') {continue;}
    
    // Check if this part is a heading
    if (headingRegex.test(part)) {
      currentHeading = part.replace(/^#+\s*/, '').replace(/<\/?h[1-6][^>]*>/gi, '').trim();
    } else {
      // This is content
      const section = {
        heading: currentHeading,
        content: part.trim()
      };
      
      // Split very long sections into smaller chunks
      if (section.content.length > 2000) {
        const chunks = splitLongContent(section.content, 1500);
        chunks.forEach((chunk, index) => {
          sections.push({
            heading: currentHeading ? `${currentHeading} (Part ${index + 1})` : null,
            content: chunk
          });
        });
      } else {
        sections.push(section);
      }
      
      currentHeading = null; // Reset heading for next section
    }
  }
  
  return sections;
}

/**
 * Ensure all sections have IDs for template rendering
 * Modifies the original frontmatter to add missing IDs
 * @param {Array} sections - Sections array to process
 * @param {Object} options - Processing options
 */
function ensureSectionIDs(sections, options) {
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // If section doesn't have an ID or has an empty ID, generate one
    if (!section.id || section.id.trim() === '') {
      // Generate ID based on section title, leadIn, sectionType, or index
      const sectionContent = findNestedField(section, 'title') || 
                           findNestedField(section, 'leadIn') || 
                           section.sectionType || 
                           `section-${i}`;
      
      section.id = generateAnchorId(sectionContent);
    }
  }
}

/**
 * Recursively find a field within nested objects
 * Searches through all possible paths to find the target field
 * @param {Object} obj - Object to search within
 * @param {string} targetField - Field name to find
 * @returns {string|null} Found field value or null
 */
function findNestedField(obj, targetField) {
  if (!obj || typeof obj !== 'object') {
    return null;
  }
  
  // Direct match - check if field exists at current level
  if (obj[targetField] && typeof obj[targetField] === 'string') {
    return obj[targetField];
  }
  
  // Recursive search through nested objects
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
      // Skip arrays for now - focus on object structures
      if (!Array.isArray(obj[key])) {
        const result = findNestedField(obj[key], targetField);
        if (result) {
          return result;
        }
      }
    }
  }
  
  return null;
}

/**
 * Split very long content into smaller searchable chunks
 * @param {string} content - Long content to split
 * @param {number} maxLength - Maximum length per chunk
 * @returns {Array} Array of content chunks
 */
function splitLongContent(content, maxLength = 1500) {
  const chunks = [];
  const sentences = content.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Process a frontmatter field that might contain markdown
 * @param {string} fieldValue - Field value to process
 * @param {Object} options - Processing options
 * @returns {string} Processed field value
 */
function processMarkdownField(fieldValue, options) {
  if (!fieldValue || typeof fieldValue !== 'string') {
    return fieldValue;
  }
  
  // Check if field contains markdown-like content
  const hasMarkdown = /[*_`#\[\]]/g.test(fieldValue);
  
  if (!hasMarkdown) {
    return fieldValue;
  }
  
  // Basic markdown processing for search
  const processed = fieldValue
    // Remove markdown links but keep text: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown emphasis: **text** or *text* -> text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove code: `code` -> code
    .replace(/`([^`]+)`/g, '$1')
    // Remove headings: ### text -> text
    .replace(/^#+\s*(.+)/gm, '$1')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return processed;
}

/**
 * Extract component-level content (for granular component indexing)
 * @param {Object} file - Metalsmith file object
 * @param {string} baseUrl - Base page URL
 * @param {Object} options - Processing options
 * @param {string} pageName - Name of the page for display
 * @returns {Promise<Array>} Component search entries
 */
async function extractComponentLevelContent(file, baseUrl, options, pageName) {
  const entries = [];
  
  // This could be extended to handle individual components within sections
  // For now, we focus on section-level indexing as the primary granular approach
  
  return entries;
}