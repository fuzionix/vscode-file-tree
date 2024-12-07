const vscode = require('vscode')
const path = require('path')
const { generateFileTree } = require('./extract')
const { copyToClipboard } = require('./utils')

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
			if (error.code === 'EACCES') {
				vscode.window.showErrorMessage(`Error copying file tree: Insufficient permissions to access path ${rootPath}.`)
			} else {
				vscode.window.showErrorMessage(`Error copying file tree: ${error.message}`)
				console.error(error)
			}
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
			if (error.code === 'EACCES') {
				vscode.window.showErrorMessage(`Error copying file tree: Insufficient permissions to access path ${targetPath}.`)
			} else {
				vscode.window.showErrorMessage(`Error copying file tree: ${error.message}`)
				console.error(error)
			}
		}
	})
	context.subscriptions.push(command)
	context.subscriptions.push(commandDir)
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
