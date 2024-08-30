const fs = require('fs')
const path = require('path')
const ignore = require('ignore')
const vscode = require('vscode')

let ig
let gitignoreLoaded = false
let configLoaded = false

const config = getConfig()
const ignoredBy = config.get('ignoredBy')
const ignoredItems = config.get('ignoredItems')

/**
 * Copies the given text to the system clipboard
 * @param {string} text - The text to copy to the clipboard
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
  gitignoreLoaded = false
  configLoaded = false

  try {
    await vscode.env.clipboard.writeText(text)
  } catch (error) {
    throw new Error(`Failed to copy to clipboard: ${error.message}`)
  }
}

/**
 * Loads and parses the .gitignore file
 * @param {string} startPath - The root path of the project
 */
function loadGitignore(startPath) {
  const gitignorePath = path.join(startPath, '.gitignore')
  
  ig = ignore()

  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
    ig.add(gitignoreContent)
  }

  if (ignoredBy === 'mix') {
    ig.add(ignoredItems)
  }
  
  gitignoreLoaded = true
}

/**
 * Checks if a file or directory should be ignored
 * @param {string} name - The name of the file or directory
 * @returns {boolean} True if the item should be ignored, false otherwise
 */
function shouldIgnore(itemPath, startPath) {
  if (!gitignoreLoaded) {
    loadGitignore(startPath)
  }

  if (!itemPath) return true

  const relativePath = path.relative(startPath, itemPath)

  if (relativePath) {
    if (ignoredBy === 'gitignore') {
      return ig.ignores(relativePath)
    } else if (ignoredBy === 'ignoredItems') {
      return ignoredItems.includes(relativePath)
    }
  } else {
    return false
  }
  
}

function getConfig() {
  return vscode.workspace.getConfiguration('fileTreeExtractor')
}

module.exports = {
  copyToClipboard,
  shouldIgnore,
  getConfig
}