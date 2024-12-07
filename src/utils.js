const fs = require('fs')
const path = require('path')
const ignore = require('ignore')
const vscode = require('vscode')

const workspaceFolder = vscode.workspace.workspaceFolders
const rootPath = workspaceFolder[0].uri.fsPath
let ignoreLoaded = false
let ig

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
  ignoreLoaded = false
}

/**
 * Recursively searches for and loads .gitignore file from current directory up to root
 * @param {string} currentPath
 * @returns {string|null} - Content of the first .gitignore found
 */
function findNearestGitignore(currentPath) {
  if (!currentPath || !currentPath.startsWith(rootPath)) return null
  const gitignorePath = path.join(currentPath, '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    return fs.readFileSync(gitignorePath, 'utf8')
  }
  return findNearestGitignore(path.dirname(currentPath), rootPath)
}

/**
 * Loads and parses the nearest .gitignore file
 * @param {string} itemPath
 */
function loadGitignore(itemPath) {
  const gitignoreContent = findNearestGitignore(itemPath, rootPath)
  if (gitignoreContent) {
    ig.add(gitignoreContent)
  }
}

/**
 * Determines whether a given path should be ignored based on gitignore rules
 * and/or custom ignore patterns
 * @param {string} itemPath
 * @param {string} startPath
 * @param {('gitignore'|'ignoredItems'|'both')} ignoredBy - The source of ignore patterns to use
 * @param {string[]} ignoredItems - Custom patterns to ignore
 * @returns {boolean} 
 */
function shouldIgnore(itemPath, startPath, ignoredBy, ignoredItems) {
  if (!ignoreLoaded) {
    ig = ignore()
    if (ignoredBy === 'gitignore' || ignoredBy === 'both') {
      loadGitignore(itemPath)
    }
    if (ignoredBy === 'ignoredItems' || ignoredBy === 'both') {
      ig.add(ignoredItems)
    }
    ignoreLoaded = true
  }

  if (!itemPath) return true

  const relativePath = path.relative(rootPath, itemPath)

  if (relativePath) {
    return ig.ignores(relativePath)
  } else {
    return false
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

module.exports = {
  copyToClipboard,
  shouldIgnore,
  formatFileSize,
  getConfig
}