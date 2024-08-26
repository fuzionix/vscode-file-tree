const vscode = require('vscode')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const command = vscode.commands.registerCommand('file-tree-extractor.copyFileTree', function () {
		const selectedPath = vscode.window.activeTextEditor?.document.fileName || ''
		console.log(selectedPath)
		vscode.window.showInformationMessage('Copied file tree to clipboard')
	})
	context.subscriptions.push(command)
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
