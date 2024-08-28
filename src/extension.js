const vscode = require('vscode')
const path = require('path')
const { generateFileTree } = require('./extract')
const { copyToClipboard } = require('./utils')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const command = vscode.commands.registerCommand('file-tree-extractor.copyFileTree', async(uri) => {
		try {
			let rootPath
			const workspaceFolder = vscode.workspace.workspaceFolders
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('No workspace folder found.')
				return
			} 
			rootPath = workspaceFolder[0].uri.fsPath
			const fileTree = await generateFileTree(rootPath)
			await copyToClipboard(fileTree)
			vscode.window.showInformationMessage('Copied file tree to clipboard.')
		} catch (error) {
			vscode.window.showErrorMessage(`Error copying file tree: ${error.message}`)
		}
	})

	const commandDir = vscode.commands.registerCommand('file-tree-extractor.copyFileTreeFromThisDir', async(uri) => {
		try {
			let targetPath
			if (uri && uri.fsPath) {
				targetPath = uri.fsPath
			} else {
				const workspaceFolder = vscode.workspace.workspaceFolders
				if (!workspaceFolder) {
					vscode.window.showErrorMessage('No workspace folder found.')
          return
				} 
				targetPath = workspaceFolder[0].uri.fsPath
			}
			const fileTree = await generateFileTree(targetPath)
      await copyToClipboard(fileTree)
			vscode.window.showInformationMessage('Copied file tree from this directary to clipboard.')
		} catch (error) {
			vscode.window.showErrorMessage(`Error copying file tree: ${error.message}`)
		}
	})
	context.subscriptions.push(command)
	context.subscriptions.push(commandDir)
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
