const fs = require('fs')
const path = require('path')
const vscode = require('vscode')

/**
 * Generates a file tree structure starting from the given path
 * @param {string} startPath - The root path to start generating the tree from
 * @returns {Promise<string>} A promise that resolves to the file tree as a string
 */
async function generateFileTree(startPath) {
  const tree = await buildTree(startPath)
  // return formatTree(tree, '', true)
  return tree
}

/**
 * Recursively builds a tree structure of the file system
 * @param {string} itemPath - The path of the current item (file or directory)
 * @returns {Promise<Object>} A promise that resolves to an object representing the tree
 */
async function buildTree(itemPath) {
  const stats = await fs.promises.stat(itemPath)
  const name = path.basename(itemPath)

  if (stats.isFile()) {
    return { name, type: 'file' }
  } else if (stats.isDirectory()) {
    try {
      if (!shouldIgnore(name)) {
        const children = await fs.promises.readdir(itemPath)
        const childNodes = await Promise.all(
          children.map(child => buildTree(path.join(itemPath, child)))
        )
        return {
          name,
          type: 'directary',
          children: childNodes.filter(node => !shouldIgnore(node?.name || ''))
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${itemPath}:`, error)
      return { name, type: 'directory', children: [] }
    }
  }
}

/**
 * Checks if a file or directory should be ignored
 * @param {string} name - The name of the file or directory
 * @returns {boolean} True if the item should be ignored, false otherwise
 */
function shouldIgnore(name) {
  const ignoredItems = ['.git', 'node_modules', '.vscode', '.env']
  if (name) {
    return ignoredItems.includes(name)
  } else {
    return true
  }
}

module.exports = {
  generateFileTree
}