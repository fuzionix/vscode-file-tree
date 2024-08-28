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
  return formatTree(tree, '', true)
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
          type: 'directory',
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
 * Formats the tree object into a string representation
 * @param {Object} node - The current node in the tree
 * @param {string} prefix - The prefix to use for the current line
 * @param {boolean} isLast - Whether this is the last item in its parent
 * @returns {string} The formatted tree string
 */
function formatTree(node, prefix = '', isLast = true, depth = 0) {
  let result = prefix
  
  if (prefix !== '' || depth === 1) {
    result += isLast ? '└─ ' : '├─ '
  }
  
  result += node.name + (node.type === 'directory' ? '/' : '') + '\n'

  if (node.type === 'directory' && node.children) {
    const childPrefix = prefix + (depth ? (isLast ? '   ' : '│  ') : '')
    node.children.forEach((child, index) => {
      const isLastChild = index === node.children.length - 1
      result += formatTree(child, childPrefix, isLastChild, depth + 1)
    })
  }
  
  return result
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