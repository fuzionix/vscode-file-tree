## [1.3.0] - 2025-03-29

### ✨ Features
- Added `useFileIcons` option to display emoji icons (📦, 📂, 📄) before each item in the tree structure
- Implemented `sortOrder` option to sort items either alphabetically or by type (folders first, then files)

### 🐛 Bug Fixes
- Fixed handling of symbolic links in the file tree generation

[1.3.0]: https://github.com/fuzionix/vscode-file-tree/compare/1.2.0...1.3.0

## [1.2.0] - 2025-01-05

### ✨ Features
- Added `directoryOnly` option to show only directories in the tree structure
- Added `showHiddenFiles` option to control visibility of hidden files (files starting with a dot)

### 🔨 Improvements
- Refined file system error handling with better error messages
- Enhanced configuration validation with type checking

[1.2.0]: https://github.com/fuzionix/vscode-file-tree/compare/1.1.0...1.2.0

## [1.1.0] - 2024-12-15

### ✨ Features
- Added support for YAML and XML output format
- Implemented gitignore pattern rule for `ignoredItems`. `ignoredItems` can now accept value like `**/src`, `*.html`.

### 🐛 Bug Fixes
- Fixed `.gitignore` not being loaded from subdirectories
- Fixed `ignoredItems` not properly ignoring nested directories

[1.1.0]: https://github.com/fuzionix/vscode-file-tree/compare/1.0.0...1.1.0

## 1.0.0 - 2024-09-22

### 🎉 Release
