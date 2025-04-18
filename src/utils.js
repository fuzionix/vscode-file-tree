const fs = require('fs')
const path = require('path')
const ignore = require('ignore')
const vscode = require('vscode')

// Cache for ignore rules by directory
const ignoreRulesCache = new Map()

/**
 * Determines whether a given path should be ignored based on gitignore rules
 * and/or custom ignore patterns
 * @param {string} itemPath - Path to check
 * @param {string} startPath - Starting directory for the tree generation
 * @param {('gitignore'|'ignoredItems'|'both')} ignoredBy - The source of ignore patterns to use
 * @param {string[]} ignoredItems - Custom patterns to ignore
 * @returns {boolean} 
 */
function shouldIgnore(itemPath, startPath, ignoredBy, ignoredItems) {
  if (!itemPath) return true
  
  if (ignoredBy === 'ignoredItems') {
    const ig = ignore().add(ignoredItems)
    const relativePath = path.relative(startPath, itemPath)
    return relativePath ? ig.ignores(relativePath) : false
  }
  
  const customPatterns = ignoredBy === 'both' ? ignoredItems : []
  
  // Find the closest parent directory that contains the itemPath
  let currentDir = itemPath
  if (!fs.statSync(itemPath).isDirectory()) {
    currentDir = path.dirname(itemPath)
  }
  
  // Check if the path should be ignored according to applicable rules
  const rules = getAppropriateIgnoreRules(itemPath, startPath, customPatterns)
  const relativePath = path.relative(startPath, itemPath)
  
  return relativePath ? rules.ignores(relativePath) : false
}

/**
 * Get correct ignore rules for an item path
 * @param {string} itemPath - Path to check
 * @param {string} startPath - Starting directory for the tree generation
 * @param {string[]} customIgnorePatterns - Custom patterns to ignore
 * @returns {ignore.Ignore} - Ignore instance with appropriate rules
 */
function getAppropriateIgnoreRules(itemPath, startPath, customIgnorePatterns = []) {
  const itemDir = fs.statSync(itemPath).isDirectory() 
    ? itemPath 
    : path.dirname(itemPath)
  
  const ig = getIgnoreRules(itemDir, startPath)
  
  if (customIgnorePatterns && customIgnorePatterns.length > 0) {
    ig.add(customIgnorePatterns)
  }
  
  return ig
}

/**
 * Gets ignore rules for a specific directory
 * @param {string} dirPath - Directory path
 * @param {string} rootPath - Root directory path
 * @returns {ignore.Ignore} - Ignore instance with rules for this directory
 */
function getIgnoreRules(dirPath, rootPath) {
  if (ignoreRulesCache.has(dirPath)) {
    return ignoreRulesCache.get(dirPath)
  }
  
  const ig = ignore()
  const gitignoreFiles = getGitignoreFiles(dirPath, rootPath)
  
  for (const [dirPath, content] of gitignoreFiles.entries()) {
    ig.add(content)
  }
  
  ignoreRulesCache.set(dirPath, ig)
  return ig
}

/**
 * Gets all .gitignore files from a path up to the root
 * @param {string} itemPath - Path to start from
 * @param {string} rootPath - Root directory path
 * @returns {Map<string, string>} - Map of directory paths to gitignore contents
 */
function getGitignoreFiles(itemPath, rootPath) {
  const gitignoreFiles = new Map()
  let currentPath = itemPath
  
  while (currentPath && currentPath.startsWith(rootPath)) {
    const gitignoreContent = readGitignoreFile(currentPath)
    if (gitignoreContent) {
      gitignoreFiles.set(currentPath, gitignoreContent)
    }
    
    // Move to parent directory
    const parentPath = path.dirname(currentPath)
    if (parentPath === currentPath) break
    currentPath = parentPath
  }
  
  return gitignoreFiles
}

/**
 * Reads a .gitignore file if it exists
 * @param {string} dirPath - Directory path to check for .gitignore
 * @returns {string|null} - Content of .gitignore or null if not found
 */
function readGitignoreFile(dirPath) {
  const gitignorePath = path.join(dirPath, '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    try {
      return fs.readFileSync(gitignorePath, 'utf8')
    } catch (error) {
      console.warn(`Failed to read ${gitignorePath}: ${error.message}`)
      return null
    }
  }
  return null
}

/**
 * Clears the ignore rules cache to ensure fresh rules are loaded
 */
function clearIgnoreCache() {
  ignoreRulesCache.clear()
}

/**
 * Copies the given text to the system clipboard
 * @param {string} text - The text to copy to the clipboard
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
  try {
    await vscode.env.clipboard.writeText(text)
  } catch (error) {
    throw new Error(`Failed to copy to clipboard: ${error.message}`)
  }
}

/**
 * Converts a file size in bytes to a human-readable string
 * @param {number} bytes - The file size in bytes
 * @param {number} [decimals=2] - The number of decimal places to use
 * @returns {string} A human-readable file size (e.g., "1.5 KB")
 */
function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

function getConfig() {
  return vscode.workspace.getConfiguration('fileTreeExtractor')
}

vscode.workspace.onDidChangeWorkspaceFolders(() => {
  clearIgnoreCache()
})

module.exports = {
  copyToClipboard,
  shouldIgnore,
  formatFileSize,
  clearIgnoreCache,
  getConfig,
}