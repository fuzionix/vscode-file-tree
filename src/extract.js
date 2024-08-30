const fs = require('fs')
const path = require('path')
const vscode = require('vscode')
const { getConfig, shouldIgnore } = require('./utils')

/**
 * Generates a file tree structure starting from the given path
 * @param {string} startPath - The root path to start generating the tree from
 * @returns {Promise<string>} A promise that resolves to the file tree as a string
 */
async function generateFileTree(startPath) {
  const config = getConfig()
  const ignoredItems = config.get('ignoredItems')
  const showFileSize = config.get('showFileSize')
  const maxDepth = config.get('maxDepth')
  const outputFormat = config.get('outputFormat')
  const indent = config.get('indent')
  const depth = 0
  let indentLine = ''
  let indentSpan = ''

  const tree = await buildTree(startPath, startPath, ignoredItems, showFileSize, maxDepth, depth)

  for (let i = 0; i < indent; i++) {
    indentLine += '─'
    indentSpan += ' '
  }

  return formatTree(tree, '', true, depth, indentLine, indentSpan)
}

/**
 * Recursively builds a tree structure of the file system
 * @param {string} itemPath - The path of the current item (file or directory)
 * @returns {Promise<Object>} A promise that resolves to an object representing the tree
 */
async function buildTree(itemPath, startPath, ignoredItems = ['node_modules'], showFileSize = false, maxDepth = -1, depth) {
  if (maxDepth !== -1 && depth >= maxDepth) {
    return null
  }

  const stats = await fs.promises.stat(itemPath)
  const name = path.basename(itemPath)

  if (shouldIgnore(itemPath, startPath)) {
    return null
  }

  if (stats.isFile()) {
    return { 
      name, 
      type: 'file',
      size: showFileSize ? stats.size : null 
    }
  } else if (stats.isDirectory()) {
    try {
      const children = await fs.promises.readdir(itemPath)
      const childNodes = await Promise.all(
        children.map(child => buildTree(path.join(itemPath, child), startPath, ignoredItems, showFileSize, maxDepth, depth + 1))
      )
      return {
        name,
        type: 'directory',
        children: childNodes.filter(node => node !== null)
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
function formatTree(node, prefix = '', isLast = true, depth = 0, indentLine, indentSpan) {
  let result = prefix
  
  if (prefix !== '' || depth === 1) {
    result += isLast ? `└${indentLine} ` : `├${indentLine} `
  }
  
  if (node) {
    result += node.name + (node.type === 'directory' ? '/' : '') + '\n'
    if (node.type === 'directory' && node.children) {
      const childPrefix = prefix + (depth ? (isLast ? `  ${indentSpan}` : `│ ${indentSpan}`) : '')
      node.children.forEach((child, index) => {
        const isLastChild = index === node.children.length - 1
        result += formatTree(child, childPrefix, isLastChild, depth + 1, indentLine, indentSpan)
      })
    }
  }
  
  return result
}

module.exports = {
  generateFileTree
}