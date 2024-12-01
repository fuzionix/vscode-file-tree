const fs = require('fs')
const path = require('path')
const ignore = require('ignore')
const vscode = require('vscode')

let ig
let gitignoreLoaded = false

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
  gitignoreLoaded = false
}

/**
 * Loads and parses the .gitignore file from the workspace root directory
 * and initializes the ignore patterns
 */
function loadGitignore() {
  const workspaceFolder = vscode.workspace.workspaceFolders
  const rootPath = workspaceFolder[0].uri.fsPath
  const gitignorePath = path.join(rootPath, '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
    ig.add(gitignoreContent)
  } else {
    throw new Error('Failed to load gitignore')
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
  if (!gitignoreLoaded) {
    ig = ignore()
    if (ignoredBy === 'gitignore' || ignoredBy === 'both') {
      loadGitignore()
    }
    if (ignoredBy === 'ignoredItems' || ignoredBy === 'both') {
      ig.add(ignoredItems)
    }
    gitignoreLoaded = true
  }

  if (!itemPath) return true

  const relativePath = path.relative(startPath, itemPath)

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