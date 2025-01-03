const vscode = require('vscode')
const path = require('path')
const { generateFileTree } = require('./extract')
const { copyToClipboard } = require('./utils')
const {
	PathNotFoundError,
	ConfigurationError,
	TreeExtractorError,
} = require('./errors')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const command = vscode.commands.registerCommand('fileTreeExtractor.copyFileTree', async (uri) => {
		let rootPath
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders
			if (!workspaceFolder || workspaceFolder.length === 0) {
				vscode.window.showErrorMessage('No workspace folder found.')
				return
			}
			rootPath = workspaceFolder[0].uri.fsPath
			const fileTree = await generateFileTree(rootPath)
			await copyToClipboard(fileTree)
			vscode.window.showInformationMessage('Copied file tree to clipboard.')
		} catch (error) {
			handleError(error, rootPath)
		}
	})

	const commandDir = vscode.commands.registerCommand('fileTreeExtractor.copyFileTreeFromThisDir', async (uri) => {
		let targetPath
		try {
			if (uri && uri.fsPath) {
				targetPath = uri.fsPath
			} else {
				const workspaceFolder = vscode.workspace.workspaceFolders
				if (!workspaceFolder || workspaceFolder.length === 0) {
					vscode.window.showErrorMessage('No workspace folder found.')
					return
				}
				targetPath = workspaceFolder[0].uri.fsPath
			}
			const fileTree = await generateFileTree(targetPath)
			await copyToClipboard(fileTree)
			vscode.window.showInformationMessage('Copied file tree from this directary to clipboard.')
		} catch (error) {
			handleError(error, targetPath)
		}
	})
	context.subscriptions.push(command)
	context.subscriptions.push(commandDir)
}

function handleError(error, path) {
	if (error instanceof TreeExtractorError) {
		switch (error.code) {
			case 'PERMISSION_DENIED':
                vscode.window.showErrorMessage(`Permission denied: Unable to access "${error.path}"`)
                break
            case 'PATH_NOT_FOUND':
                vscode.window.showErrorMessage(`Path not found: "${error.path}" does not exist`)
                break
			case 'INVALID_CONFIG':
				vscode.window.showErrorMessage(
					`Invalid configuration: ${error.details.errors.join(', ')}`
				)
				break
			default:
				vscode.window.showErrorMessage(`Error copying file tree: ${error.message}`)
		}
	} else {
		vscode.window.showErrorMessage(`Unexpected error: ${error.message}`)
	}
	console.error(error)
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
