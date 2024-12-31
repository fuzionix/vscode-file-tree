const vscode = require('vscode')

class ConfigurationManager {
    constructor() {
        this.updateConfig()
    }

    updateConfig() {
        this.config = vscode.workspace.getConfiguration('fileTreeExtractor')
    }

    get defaultConfig() {
        return {
            ignoredItems: ['node_modules', '.git'],
            ignoredBy: 'ignoredItems',
            indent: 1,
            showFileSize: false,
            maxDepth: -1,
            outputFormat: 'ascii',
            directoryOnly: false
        }
    }

    validateConfig(config) {
        const errors = []

        if (!Array.isArray(config.ignoredItems)) {
            errors.push('ignoredItems must be an array')
        }

        if (typeof config.indent !== 'number' || config.indent < 0) {
            errors.push('Indent must be a positive number')
        }

        if (typeof config.maxDepth !== 'number' || config.maxDepth < -1) {
            errors.push('maxDepth must be -1 or a positive number')
        }

        if (!['ascii', 'json', 'yaml', 'xml'].includes(config.outputFormat)) {
            errors.push('Invalid output format')
        }

        return errors
    }

    get(key) {
        this.updateConfig()
        return this.config.get(key, this.defaultConfig[key])
    }

    getAll() {
        this.updateConfig()
        const config = {}
        for (const [key, defaultValue] of Object.entries(this.defaultConfig)) {
            config[key] = this.get(key)
        }
        return config
    }
}

module.exports = new ConfigurationManager()