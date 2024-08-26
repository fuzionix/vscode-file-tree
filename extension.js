const vscode = require('vscode')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const disposable = vscode.commands.registerCommand('file-tree-extractor.copyFileTree', function () {
		vscode.window.showInformationMessage('Copied file tree to clipboard')
	})
	context.subscriptions.push(disposable)
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
