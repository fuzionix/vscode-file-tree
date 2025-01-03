class TreeExtractorError extends Error {
    constructor(message, code, path, details = {}) {
        super(message)
        this.name = 'TreeExtractorError'
        this.code = code
        this.path = path
        this.details = details
    }
}

class PermissionError extends TreeExtractorError {
    constructor(path) {
        super(
            `Permission denied: Unable to access "${path}"`,
            'PERMISSION_DENIED',
            path
        )
    }
}

class PathNotFoundError extends TreeExtractorError {
    constructor(path) {
        super(
            `Path not found: "${path}" does not exist`,
            'PATH_NOT_FOUND',
            path
        )
    }
}

class ConfigurationError extends TreeExtractorError {
    constructor(errors) {
        super(
            'Invalid configuration',
            'INVALID_CONFIG',
            null,
            { errors }
        )
    }
}

module.exports = {
    TreeExtractorError,
    PermissionError,
    PathNotFoundError,
    ConfigurationError,
}