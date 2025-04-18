const fs = require('fs').promises
const path = require('path')
const yaml = require('js-yaml')
const { XMLBuilder } = require('fast-xml-parser')
const config = require('./config')
const { getConfig, shouldIgnore, formatFileSize, clearIgnoreCache } = require('./utils')
const {
  TreeExtractorError,
  PermissionError,
  PathNotFoundError,
  ConfigurationError,
} = require('./errors')

const FILE_ICONS = {
  ROOT: '📦',
  DIRECTORY: '📂',
  FILE: '📄',
  SYMLINK: '🔗'
}

/**
 * Generates a file tree structure starting from the given path
 * @param {string} startPath - The root path to start generating the tree from
 * @returns {Promise<string>} A promise that resolves to the file tree as a string
 */
async function generateFileTree(startPath) {
  try {
    clearIgnoreCache()
    
    // Validate configuration
    const buildConfig = config.getAll()
    const configErrors = config.validateConfig(buildConfig)
    if (configErrors.length > 0) {
      throw new ConfigurationError(configErrors)
    }

    // Validate start path
    try {
      await fs.access(startPath, fs.constants.R_OK)
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new PathNotFoundError(startPath)
      } else if (error.code === 'EACCES') {
        throw new PermissionError(startPath)
      }
      throw error
    }

    const depth = 0
    const tree = await buildTree(startPath, startPath, buildConfig, depth)
    if (tree) {
      tree.isRoot = true
    }
    return formatOutput(tree, buildConfig, depth)
  } catch (error) {
    if (error instanceof TreeExtractorError) {
      throw error
    }

    throw new TreeExtractorError(
      'An unexpected error occurred while generating the file tree',
      'UNKNOWN_ERROR',
      startPath,
      { originalError: error.message }
    )
  }
}

/**
 * Recursively builds a tree structure of the file system
 * @param {string} itemPath - The path of the current item (file or directory)
 * @param {string} startPath - The original starting path
 * @param {Object} buildConfig - Configuration options
 * @param {number} depth - Current depth in the tree
 * @param {Set} [visitedPaths] - Set of already visited paths to detect loops
 * @returns {Promise<Object>} A promise that resolves to an object representing the tree
 */
async function buildTree(itemPath, startPath, buildConfig, depth, visitedPaths = new Set()) {
  if (buildConfig.maxDepth !== -1 && depth >= buildConfig.maxDepth) {
    return null
  }

  const normalizedPath = path.resolve(itemPath)
  if (visitedPaths.has(normalizedPath)) {
    return {
      name: path.basename(itemPath) + ' (symlink loop)',
      type: 'symlink',
      target: normalizedPath
    }
  }

  visitedPaths.add(normalizedPath)

  if (!buildConfig.showHiddenFiles && isHiddenFile(itemPath)) {
    return null
  }

  if (shouldIgnore(itemPath, startPath, buildConfig.ignoredBy, buildConfig.ignoredItems)) {
    return null
  }

  let stats, lstat
  try {
    stats = await fs.stat(itemPath)
    lstat = await fs.lstat(itemPath)
  } catch (error) {
    console.warn(`Warning: Skipping "${itemPath}" due to error:`, error.message)
    return null
  }
  const name = path.basename(itemPath)
  const isSymlink = lstat.isSymbolicLink()

  if (isSymlink) {
    try {
      const target = await fs.readlink(itemPath)
      return {
        name,
        type: 'symlink',
        target,
        size: buildConfig.showFileSize ? formatFileSize(lstat.size) : null
      }
    } catch (error) {
      return {
        name: name + ' (broken symlink)',
        type: 'symlink',
        target: 'unknown'
      }
    }
  }

  if (stats.isFile() && buildConfig.directoryOnly) {
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
      const children = await fs.readdir(itemPath)
      const childNodes = await Promise.all(
        children.map(child => buildTree(path.join(itemPath, child), startPath, buildConfig, depth + 1, new Set(visitedPaths)))
      )
      const filteredNodes = childNodes.filter(node => node !== null)
      const sortedNodes = sortNodes(filteredNodes, buildConfig.sortOrder)
      return {
        name,
        type: 'directory',
        children: sortedNodes
      }
    } catch (error) {
      console.warn(`Warning: Cannot read directory "${itemPath}":`, error.message)
      return { name, type: 'directory', children: [] }
    }
  }
}

/**
 * Sorts the nodes based on the specified sort order
 * @param {Array} nodes - Array of node objects
 * @param {string} sortOrder - The sort order ('alphabetical' or 'type')
 * @returns {Array} - Sorted array of nodes
 */
function sortNodes(nodes, sortOrder) {
  if (sortOrder === 'type') {
    return nodes.sort((a, b) => {
      // If types are different, directories come first
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }

      // If types are same, sort alphabetically by name
      return a.name.localeCompare(b.name)
    })
  } else {
    return nodes.sort((a, b) => a.name.localeCompare(b.name))
  }
}

function formatOutput(tree, buildConfig, depth = 0) {
  switch (buildConfig.outputFormat) {
    case 'ascii':
      let indentLine = ''
      let indentSpan = ''
      for (let i = 0; i < buildConfig.indent; i++) {
        indentLine += '─'
        indentSpan += ' '
      }
      return formatTree(tree, '', true, depth, indentLine, indentSpan, buildConfig.useFileIcons)
    case 'json':
      return JSON.stringify(tree, null, buildConfig.indent)
    case 'yaml':
      return yaml.dump(tree, {
        noRefs: true,
        lineWidth: -1,
        indent: 2
      })
    case 'xml':
      const builder = new XMLBuilder({
        format: true,
        indentBy: ' '.repeat(buildConfig.indent),
        ignoreAttributes: false,
        suppressBooleanAttributes: false
      })
      return builder.build(transformTreeForXml(tree))
    default:
      throw new ConfigurationError([`Unsupported output format: ${buildConfig.outputFormat}`])
  }
}

/**
 * Formats the tree object into a string representation
 * @param {Object} node - The current node in the tree
 * @param {string} prefix - The prefix to use for the current line
 * @param {boolean} isLast - Whether this is the last item in its parent
 * @returns {string} The formatted tree string
 */
function formatTree(node, prefix = '', isLast = true, depth = 0, indentLine, indentSpan, useFileIcons = false) {
  let result = prefix
  if (prefix !== '' || depth === 1) {
    result += isLast ? `└${indentLine} ` : `├${indentLine} `
  }
  if (node) {
    let iconPrefix = ''
    if (useFileIcons) {
      if (node.isRoot) {
        iconPrefix = `${FILE_ICONS.ROOT} `
      } else if (node.type === 'directory') {
        iconPrefix = `${FILE_ICONS.DIRECTORY} `
      } else {
        iconPrefix = `${FILE_ICONS.FILE} `
      }
    }

    result += iconPrefix + node.name + (node.type === 'directory' ? '/' : '') + `${node.size ? ' (' + node.size + ')' : ''}` + '\n'
    if (node.type === 'directory' && node.children) {
      const childPrefix = prefix + (depth ? (isLast ? `  ${indentSpan}` : `│ ${indentSpan}`) : '')
      node.children.forEach((child, index) => {
        const isLastChild = index === node.children.length - 1
        result += formatTree(child, childPrefix, isLastChild, depth + 1, indentLine, indentSpan, useFileIcons)
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

function isHiddenFile(filePath) {
  const basename = path.basename(filePath)
  return basename.startsWith('.')
}

module.exports = {
  generateFileTree
}