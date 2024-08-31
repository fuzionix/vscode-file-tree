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
 * Loads and parses the .gitignore file
 * @param {string} startPath - The root path of the project
 */
function loadGitignore(ignoredBy, ignoredItems) {
  const workspaceFolder = vscode.workspace.workspaceFolders
  const rootPath = workspaceFolder[0].uri.fsPath
  const gitignorePath = path.join(rootPath, '.gitignore')
  ig = ignore()
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
    ig.add(gitignoreContent)
  } else {
    throw new Error('Failed to load gitignore')
  }
  if (ignoredBy === 'both') {
    ig.add(ignoredItems)
  }
  gitignoreLoaded = true
}

/**
 * Checks if a file or directory should be ignored
 * @param {string} name - The name of the file or directory
 * @returns {boolean} True if the item should be ignored, false otherwise
 */
function shouldIgnore(itemPath, startPath, ignoredBy, ignoredItems) {
  if (!gitignoreLoaded && (ignoredBy === 'gitignore' || ignoredBy === 'both')) {
    loadGitignore(ignoredBy, ignoredItems)
  }

  if (!itemPath) return true

  const relativePath = path.relative(startPath, itemPath)

  if (relativePath) {
    if (ignoredBy === 'gitignore' || ignoredBy === 'both') {
      return ig.ignores(relativePath)
    } else if (ignoredBy === 'ignoredItems') {
      return ignoredItems.includes(relativePath)
    }
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