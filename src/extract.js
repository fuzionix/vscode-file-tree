const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { XMLBuilder } = require('fast-xml-parser')
const vscode = require('vscode')
const { getConfig, shouldIgnore, formatFileSize } = require('./utils')

/**
 * Generates a file tree structure starting from the given path
 * @param {string} startPath - The root path to start generating the tree from
 * @returns {Promise<string>} A promise that resolves to the file tree as a string
 */
async function generateFileTree(startPath) {
  const config = getConfig()
  const buildConfig = {
    ignoredBy: config.get('ignoredBy') || 'ignoredItems',
    ignoredItems: config.get('ignoredItems') || ['node_modules'],
    showFileSize: config.get('showFileSize') || false,
    maxDepth: config.get('maxDepth'),
    outputFormat: config.get('outputFormat') || 'ascii',
  }
  const indent = config.get('indent')
  const depth = 0

  const tree = await buildTree(startPath, startPath, buildConfig, depth)

  switch (buildConfig.outputFormat) {
    case 'ascii':
      let indentLine = ''
      let indentSpan = ''
      for (let i = 0; i < indent; i++) {
        indentLine += '─'
        indentSpan += ' '
      }
      return formatTree(tree, '', true, depth, indentLine, indentSpan)
    case 'json':
      return JSON.stringify(tree, null, indent)
    case 'yaml':
      return yaml.dump(tree, {
        noRefs: true,
        lineWidth: -1
      })
    case 'xml':
      const transformedTree = transformTreeForXml(tree)
      const builder = new XMLBuilder({
        format: true,
        indentBy: ' '.repeat(indent),
        ignoreAttributes: false,
        suppressBooleanAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '#text'
      })
      return builder.build(transformedTree)
  }
}

/**
 * Recursively builds a tree structure of the file system
 * @param {string} itemPath - The path of the current item (file or directory)
 * @returns {Promise<Object>} A promise that resolves to an object representing the tree
 */
async function buildTree(itemPath, startPath, buildConfig, depth) {
  if (buildConfig.maxDepth !== -1 && depth >= buildConfig.maxDepth) {
    return null
  }

  const stats = await fs.promises.stat(itemPath)
  const name = path.basename(itemPath)

  if (shouldIgnore(itemPath, startPath, buildConfig.ignoredBy, buildConfig.ignoredItems)) {
    return null
  }

  if (stats.isFile()) {
    return {
      name,
      type: 'file',
      size: buildConfig.showFileSize ? formatFileSize(stats.size) : null
    }
  } else if (stats.isDirectory()) {
    try {
      const children = await fs.promises.readdir(itemPath)
      const childNodes = await Promise.all(
        children.map(child => buildTree(path.join(itemPath, child), startPath, buildConfig, depth + 1))
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
    result += node.name + (node.type === 'directory' ? '/' : '') + `${node.size ? ' (' + node.size + ')' : ''}` + '\n'
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

/**
 * Transforms the tree structure for XML output
 * @param {Object} node
 * @returns {Object}
 */
function transformTreeForXml(node) {
  const transformed = {
    [node.type]: {
      'name': node.name
    }
  }

  if (node.size) {
    transformed[node.type]['size'] = node.size
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      const childTransformed = transformTreeForXml(child)
      const childType = Object.keys(childTransformed)[0]

      if (transformed[node.type][childType]) {
        if (!Array.isArray(transformed[node.type][childType])) {
          transformed[node.type][childType] = [transformed[node.type][childType]]
        }
        transformed[node.type][childType].push(childTransformed[childType])
      } else {
        transformed[node.type][childType] = childTransformed[childType]
      }
    })
  }

  return transformed
}

module.exports = {
  generateFileTree
}