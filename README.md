<div align="center">

[中文文档 → README_zh-CN.md](README_zh-CN.md)

</div>

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)
![Stars](https://img.shields.io/github/stars/YOUR_USERNAME/YOUR_REPO?style=for-the-badge)
![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-1.75%2B-DEA584?style=for-the-badge&logo=rust&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)

</div>

---

<div align="center">

# Light Office Tools

### A lightweight, fully offline desktop office toolkit

**Completely offline · Lightning fast · Privacy first · No bloat**

</div>

---

## 📌 Project Overview

Light Office Tools is a desktop application built with Tauri 2.0 that provides a comprehensive suite of office document processing utilities. Unlike bulky office suites that require installation and network connectivity, this tool runs entirely on your local machine, starts instantly, and never sends your data to the cloud.

### 🎯 Pain Points Solved

- **No internet dependency** — All features work offline, perfect for restricted network environments
- **No bloatware** — A single lightweight executable, no installation required for portable version
- **Privacy protection** — All processing happens locally; your files never leave your computer
- **Tool consolidation** — Replace dozens of single-purpose websites and apps with one unified tool

### 🌟 Core Highlights

1. **100% Offline** — All processing runs locally, no network calls except optional OCR model downloads
2. **Blazing Fast** — Rust-powered backend with WebView2 frontend, starts in under 1 second
3. **Rich Features** — 30+ tools covering text, images, PDFs, codecs, calculations, printing, and more
4. **Clean UI** — Modern interface with light/dark themes, frosted glass design, and intuitive layout

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Development Scripts](#-development-scripts)
- [Usage Examples](#-usage-examples)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [Changelog](#-changelog)
- [License](#-license)
- [Contact](#-contact)

---

## ✨ Features

### 🟢 Basic Features

| Category | Tools |
|----------|-------|
| **Text Processing** | Text replace, deduplication, sorting, statistics, case conversion |
| **Encoding / Decoding** | Base64, URL encoding, Unicode, Hash (MD5/SHA1/SHA256/SHA512) |
| **JSON Tools** | Format, validate, compress/minify |
| **Calculators** | Timestamp converter, base converter, UUID generator |
| **Image Tools** | Compress, format convert, resize, color picker |
| **Document Convert** | Excel conversion, Markdown conversion, encoding conversion |
| **PDF Tools** | Merge, split, compress, PDF to images |
| **QR Code** | Generate QR code, scan QR code from image |
| **Print Manager** | Single print, batch print, print queue, printer management |

### 🔵 Advanced Features

- **Drag and Drop Upload** — Global drag-and-drop support with automatic file type detection
- **Batch Processing** — Queue-based batch processing with pause/resume support
- **File Preview** — Built-in preview panel with resizable layout
- **Theme Support** — Light and dark themes with frosted glass design
- **Multi-format Support** — Handles common office document formats (PDF, Excel, Word, images)
- **Printer Management** — Network printer scanning, saved printers, connection testing
- **Portable Mode** — All data stored alongside the executable, no system modifications

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Vue 3.4 (Composition API + `<script setup>`)
- **Build Tool**: Vite 5.2
- **Language**: TypeScript 5.4
- **UI Library**: Naive UI 2.38
- **CSS**: Tailwind CSS 3.4
- **State Management**: Pinia 2.1
- **Router**: Vue Router 4.3
- **Icons**: @vicons/ionicons5

### Backend (Rust)

- **Framework**: Tauri 2.0
- **Edition**: Rust 2021
- **Key Dependencies**:
  - `lopdf` — PDF document manipulation
  - `image` — Image processing (RustImage crate)
  - `qrcode` — QR code generation
  - `sha2` / `sha1` / `md-5` — Cryptographic hashing
  - `base64` — Base64 encoding/decoding
  - `encoding_rs` — Character encoding conversion
  - `tokio` — Async runtime
  - `serde` / `serde_json` — Serialization

### Frontend Utilities

- `pdf-lib` — PDF creation and modification
- `xlsx` (SheetJS) — Excel file processing
- `mammoth` — Word document to HTML conversion
- `marked` — Markdown parsing
- `tesseract.js` — OCR (JavaScript fallback)
- `jimp` / `sharp` — Image processing

### Toolchain

- **Package Manager**: npm
- **Version Control**: Git
- **CI/CD**: [Your CI tool here]

---

## 📋 Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10 1809+ | Windows 11 22H2+ |
| **WebView2** | Runtime pre-installed | Latest stable |
| **RAM** | 2 GB | 4 GB+ |
| **Disk Space** | 50 MB | 200 MB+ (for OCR models) |
| **CPU** | x86_64 / ARM64 | Multi-core processor |

### Development Environment

- **Node.js**: >= 18.0.0 (LTS recommended: 20.x)
- **npm**: >= 9.0.0
- **Rust**: >= 1.75.0 (stable channel)
- **Microsoft Visual Studio Build Tools** (Windows only):
  - Desktop development with C++ workload
  - Windows 10/11 SDK
- **WebView2** — Pre-installed on Windows 11; download for Windows 10

### Environment Variables

No mandatory environment variables are required. Optional configurations:

```bash
# Optional: Custom cache directory
# LIGHT_OFFICE_CACHE_DIR=/path/to/cache

# Optional: Custom OCR models directory
# LIGHT_OFFICE_OCR_MODELS_DIR=/path/to/ocr_models
```

### API Keys / Secrets

This project does not require any API keys or third-party service credentials. All features work offline.

---

## 🚀 Quick Start

### Option 1: Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

#### 2. Install Frontend Dependencies

```bash
# Using npm
npm install

# Or using pnpm (recommended)
# pnpm install
```

#### 3. Install Rust Dependencies

Rust dependencies are automatically fetched by Cargo. Verify your Rust installation:

```bash
rustc --version
cargo --version
```

If Rust is not installed, install it from [rustup.rs](https://rustup.rs/).

#### 4. Start Development Server

```bash
# Start Tauri dev mode (frontend + backend together)
npm run tauri:dev

# Or start frontend only (browser preview)
npm run dev
```

#### 5. Access the Application

- **Tauri Dev Mode**: The application window opens automatically
- **Browser Preview**: Visit `http://localhost:1420`

> **Note**: Browser preview does not include Rust backend features (file operations, printing, etc.). Use Tauri dev mode for full functionality.

---

### Option 2: Docker / Docker Compose

> **Note**: This is a desktop Tauri application. Docker is primarily useful for CI/build environments.

#### Dockerfile (Build Environment)

```dockerfile
FROM rust:1.75-bullseye

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install WebView2 dependencies (for headless builds)
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy Rust manifest
COPY src-tauri/Cargo.toml src-tauri/Cargo.lock ./src-tauri/

# Copy source code
COPY . .

# Build the application
RUN npm run build
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  build-env:
    build: .
    volumes:
      - ./dist-release:/app/dist-release
    command: npm run build:all
```

#### Run Build with Docker

```bash
docker-compose up --build
```

The build output will be available in `./dist-release/`.

---

### Option 3: Production Deployment

#### Building Release Binaries

```bash
# Build all release versions (MSI + NSIS installer + portable)
npm run build:all

# Build only MSI installer
npm run build:installer

# Build only portable version
npm run build:portable
```

Output locations:
- **MSI Installer**: `dist-release/msi-installer/`
- **NSIS Installer**: `dist-release/nsis-installer/`
- **Portable**: `dist-release/portable/`

#### Portable Version Deployment

1. Copy the entire portable folder to the target machine
2. Run `LightOfficeTools.exe` directly
3. All data (cache, config, logs, ocr_models) is stored in the same directory

#### Installer Version Deployment

1. Run the MSI/NSIS installer
2. Follow the installation wizard
3. Choose install location (default: `%LOCALAPPDATA%\Programs\LightOfficeTools`)
4. Data is stored in `%USERPROFILE%\Documents\LightOfficeTools\` by default

#### Process Considerations

This is a desktop application, not a server. No daemon process or Nginx configuration is required. The application runs as a standard Windows desktop program.

---

## ⚙️ Configuration

### Tauri Configuration (`src-tauri/tauri.conf.json`)

| Parameter | Type | Default | Description | Risk Level |
|-----------|------|---------|-------------|------------|
| `productName` | string | `"LightOfficeTools"` | Application display name | Low |
| `version` | string | `"1.0.0"` | Application version | Low |
| `identifier` | string | `"com.lightoffice.tools"` | Unique app identifier (reverse DNS) | **High** — Must be unique for code signing |
| `app.windows[0].title` | string | `"轻量化办公文档工具箱"` | Window title bar text | Low |
| `app.windows[0].width` | number | `1200` | Initial window width | Low |
| `app.windows[0].height` | number | `800` | Initial window height | Low |
| `app.windows[0].dragDropEnabled` | boolean | `true` | Enable file drag-and-drop | Medium — Disable if not needed for security |
| `plugins.fs.scope` | string[] | See config | File system access scope | **High** — Restrict to necessary paths only |
| `bundle.targets` | string[] | `["msi", "nsis"]` | Build target formats | Low |
| `bundle.category` | string | `"Productivity"` | App category for store listing | Low |

### Frontend Configuration

#### Theme Configuration

The theme is managed via Pinia store (`src/stores/app.ts`):

```typescript
// Available themes: 'light' | 'dark'
// Default: 'light'
```

#### Primary Color

```typescript
// Primary color: '#1677ff' (business blue)
// Configurable in settings store
```

### Rust Cargo Configuration (`src-tauri/Cargo.toml`)

| Profile Setting | Value | Purpose |
|-----------------|-------|---------|
| `panic = "abort"` | abort | Smaller binary size, no unwinding |
| `codegen-units = 1` | 1 | Better optimization (slower compile) |
| `lto = true` | true | Link-time optimization (smaller + faster) |
| `opt-level = "s"` | "s" | Optimize for binary size |
| `strip = true` | true | Remove debug symbols |

> **Warning**: Changing release profile settings may affect binary size, performance, or debuggability. Modify with caution.

---

## 📁 Project Structure

```
office-tools/
├── public/                          # Static assets copied to dist root
│   └── app-icon.png                 # Application icon
├── scripts/                         # Build and utility scripts
│   ├── build-release.js             # Multi-target release build script
│   ├── create-default-icon.js       # Default icon generation
│   └── generate-icons.js            # Multi-format icon generation
├── src/                             # Frontend source code
│   ├── assets/                      # Static assets (styles, images)
│   │   └── styles/
│   │       └── main.css             # Global styles & Tailwind entry
│   ├── components/                  # Reusable Vue components
│   │   ├── common/                  # Shared business components
│   │   │   ├── ActionBar.vue        # Bottom action bar
│   │   │   ├── FileDropZone.vue     # Drag & drop upload zone
│   │   │   └── ToolLayout.vue       # Unified tool page layout
│   │   ├── layout/                  # Layout components
│   │   │   ├── AppFooter.vue        # Footer status bar
│   │   │   ├── AppHeader.vue        # Top header with search
│   │   │   └── AppSidebar.vue       # Left sidebar navigation
│   │   └── print/                   # Print-specific components
│   │       └── PrintPreview.vue     # Print preview component
│   ├── composables/                 # Vue composables (reusable logic)
│   │   ├── useFileOperation.ts      # File operation utilities
│   │   └── useNotification.ts       # Notification utilities
│   ├── router/                      # Vue Router configuration
│   │   └── index.ts                 # Route definitions
│   ├── stores/                      # Pinia state stores
│   │   ├── app.ts                   # App-wide state (theme, etc.)
│   │   └── settings.ts              # User settings
│   ├── views/                       # Page components (route-level)
│   │   ├── calculate/               # Calculator tools
│   │   │   ├── BaseConvert.vue      # Base number converter
│   │   │   ├── TimestampConvert.vue # Unix timestamp converter
│   │   │   └── UuidGenerator.vue    # UUID generator
│   │   ├── codec/                   # Encoding/decoding tools
│   │   │   ├── Base64Codec.vue      # Base64 encoder/decoder
│   │   │   ├── HashCalc.vue         # Hash calculator
│   │   │   ├── UnicodeCodec.vue     # Unicode converter
│   │   │   └── UrlCodec.vue         # URL encoder/decoder
│   │   ├── convert/                 # Document conversion tools
│   │   │   ├── EncodingConvert.vue  # Text encoding converter
│   │   │   ├── ExcelConvert.vue     # Excel format converter
│   │   │   └── MarkdownConvert.vue  # Markdown converter
│   │   ├── image/                   # Image processing tools
│   │   │   ├── ColorPicker.vue      # Color picker
│   │   │   ├── ImageCompress.vue    # Image compressor
│   │   │   ├── ImageConvert.vue     # Image format converter
│   │   │   └── ImageResize.vue      # Image resizer
│   │   ├── json/                    # JSON tools
│   │   │   ├── JsonCompress.vue     # JSON minifier
│   │   │   ├── JsonFormat.vue       # JSON formatter
│   │   │   └── JsonValidate.vue     # JSON validator
│   │   ├── pdf/                     # PDF tools
│   │   │   ├── PdfCompress.vue      # PDF compressor
│   │   │   ├── PdfMerge.vue         # PDF merger
│   │   │   ├── PdfSplit.vue         # PDF splitter
│   │   │   └── PdfToImages.vue      # PDF to images converter
│   │   ├── print/                   # Print management
│   │   │   ├── BatchPrint.vue       # Batch printing
│   │   │   ├── PrintManager.vue     # Print manager dashboard
│   │   │   ├── PrintQueue.vue       # Print queue
│   │   │   └── SinglePrint.vue      # Single file print
│   │   ├── system/                  # System utilities
│   │   │   ├── QrCodeGenerator.vue  # QR code generator
│   │   │   └── QrCodeScanner.vue    # QR code scanner
│   │   ├── text/                    # Text processing tools
│   │   │   ├── TextCase.vue         # Text case converter
│   │   │   ├── TextDedup.vue        # Text deduplication
│   │   │   ├── TextReplace.vue      # Text find & replace
│   │   │   ├── TextSort.vue         # Text sorting
│   │   │   └── TextStats.vue        # Text statistics
│   │   └── HomeView.vue             # Home / dashboard page
│   ├── App.vue                      # Root Vue component
│   ├── main.ts                      # Application entry point
│   └── vite-env.d.ts                # Vite type definitions
├── src-tauri/                       # Rust backend (Tauri)
│   ├── capabilities/                # Tauri capability definitions
│   │   └── default.json             # Default capability set
│   ├── gen/                         # Generated schemas (build artifacts)
│   │   └── schemas/                 # JSON schema files
│   ├── icons/                       # Application icons (all formats)
│   │   ├── android/                 # Android icons
│   │   ├── ios/                     # iOS icons
│   │   ├── icon.ico                 # Windows icon
│   │   ├── icon.icns                # macOS icon
│   │   └── icon.png                 # Source icon
│   ├── src/                         # Rust source code
│   │   ├── commands/                # Tauri command handlers
│   │   │   ├── codec.rs             # Codec commands (Base64, etc.)
│   │   │   ├── encoding.rs          # Encoding conversion commands
│   │   │   ├── file.rs              # File operation commands
│   │   │   ├── hash.rs              # Hash calculation commands
│   │   │   ├── image.rs             # Image processing commands
│   │   │   ├── mod.rs               # Command module exports
│   │   │   ├── pdf.rs               # PDF processing commands
│   │   │   ├── print.rs             # Print management commands
│   │   │   └── qrcode.rs            # QR code commands
│   │   ├── lib.rs                   # Library entry point & Tauri builder
│   │   └── main.rs                  # Binary entry point
│   ├── Cargo.lock                   # Rust dependency lockfile
│   ├── Cargo.toml                   # Rust manifest & dependencies
│   └── tauri.conf.json              # Tauri configuration
├── .gitignore                       # Git ignore rules
├── index.html                       # Vite HTML entry point
├── package.json                     # NPM manifest & scripts
├── package-lock.json                # NPM lockfile
└── README.md                        # This file

```

---

## 📜 Development Scripts

### Build Commands

```bash
# Start Vite dev server (frontend only, browser preview)
npm run dev

# Build frontend for production
npm run build

# Preview production build locally
npm run preview
```

### Tauri Commands

```bash
# Start Tauri dev mode (full app with Rust backend)
npm run tauri:dev

# Build Tauri release binaries
npm run tauri:build

# Open Tauri CLI help
npm run tauri -- --help
```

### Release Build Commands

```bash
# Build all release versions (installer + portable)
npm run build:all

# Build MSI + NSIS installers only
npm run build:installer

# Build portable version only
npm run build:portable

# Build release (alias for tauri:build)
npm run build:release
```

### Code Quality

```bash
# Type check with TypeScript
npx vue-tsc --noEmit

# Format code with Prettier (if configured)
# npx prettier --write .

# Lint code (if ESLint is configured)
# npm run lint
```

### Utility Scripts

```bash
# Generate application icons in all formats
npm run generate-icons
```

### Git Operations

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Create feature branch
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "feat: add your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

---

## 💻 Usage Examples

### Example 1: PDF Merge (Using Tauri API)

```typescript
import { invoke } from '@tauri-apps/api/core'

interface MergeResult {
  success: boolean
  output_path: string
  page_count: number
}

async function mergePdfs(inputFiles: string[], outputPath: string): Promise<MergeResult> {
  const result = await invoke<MergeResult>('pdf_merge', {
    inputPaths: inputFiles,
    outputPath: outputPath
  })
  return result
}

// Usage
const result = await mergePdfs(
  ['C:/Docs/file1.pdf', 'C:/Docs/file2.pdf'],
  'C:/Output/merged.pdf'
)
console.log(`Merged ${result.page_count} pages → ${result.output_path}`)
```

### Example 2: Image Compression (Using Tauri API)

```typescript
import { invoke } from '@tauri-apps/api/core'

interface CompressResult {
  success: boolean
  output_path: string
  original_size: number
  compressed_size: number
  ratio: number
}

async function compressImage(
  inputPath: string,
  outputPath: string,
  quality: number = 75
): Promise<CompressResult> {
  return await invoke<CompressResult>('image_compress', {
    inputPath,
    outputPath,
    quality
  })
}

// Usage
const result = await compressImage(
  'C:/Photos/photo.jpg',
  'C:/Photos/photo_compressed.jpg',
  80
)
console.log(`Compressed: ${((1 - result.ratio) * 100).toFixed(1)}% reduction`)
```

### Example 3: Hash Calculation (Using Tauri API)

```typescript
import { invoke } from '@tauri-apps/api/core'

interface HashResult {
  md5: string
  sha1: string
  sha256: string
  sha512: string
}

async function calculateFileHashes(filePath: string): Promise<HashResult> {
  return await invoke<HashResult>('calculate_hashes', {
    filePath
  })
}

// Usage
const hashes = await calculateFileHashes('C:/Docs/document.pdf')
console.log('MD5:', hashes.md5)
console.log('SHA256:', hashes.sha256)
```

### Example 4: QR Code Generation (Using Tauri API)

```typescript
import { invoke } from '@tauri-apps/api/core'

async function generateQrCode(
  content: string,
  size: number = 256
): Promise<string> {
  // Returns base64-encoded PNG image
  return await invoke<string>('generate_qrcode', {
    content,
    size
  })
}

// Usage
const base64Image = await generateQrCode('https://example.com', 512)
const img = document.createElement('img')
img.src = `data:image/png;base64,${base64Image}`
document.body.appendChild(img)
```

---

## ❓ FAQ

### Q1: The application fails to start with "WebView2 not found" error

**A**: Install the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/). It's pre-installed on Windows 11 but may need manual installation on Windows 10.

### Q2: Rust build fails with "linker `link.exe` not found"

**A**: Install Microsoft Visual Studio Build Tools:

1. Download from [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Run the installer
3. Select "Desktop development with C++" workload
4. Ensure Windows 10/11 SDK is checked
5. Click Install

### Q3: `npm run tauri:dev` fails with cargo errors

**A**: Try these steps:

```bash
# Clean Rust build cache
cd src-tauri && cargo clean && cd ..

# Reinstall dependencies
npm install

# Update Rust toolchain
rustup update stable
```

### Q4: Drag and drop doesn't work

**A**: Verify the following:

1. `dragDropEnabled: true` is set in `src-tauri/tauri.conf.json` under `app.windows[0]`
2. You're running in Tauri mode (not browser preview)
3. The file type is supported by the current page
4. On Windows, try running as administrator if drag-drop from elevated apps fails

### Q5: PDF/Image processing is slow

**A**: Performance tips:

1. Use release builds (`npm run tauri:build`), not dev builds
2. For batch operations, use the queue system to manage concurrency
3. Large files may take time — check the progress bar for status
4. Ensure you have enough free RAM (4GB+ recommended)

### Q6: How to reset application data?

**A**: Depending on your version:

- **Portable version**: Delete the `cache/`, `config/`, and `logs/` folders next to the EXE
- **Installer version**: Delete `%USERPROFILE%\Documents\LightOfficeTools\`

### Q7: Can I use this on macOS or Linux?

**A**: Currently, only Windows is officially supported and tested. The Tauri framework is cross-platform, so macOS and Linux builds may be possible with minor modifications to the build configuration.

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Branch Naming Convention

```
feature/<description>    # New features
fix/<description>        # Bug fixes
docs/<description>       # Documentation updates
refactor/<description>   # Code refactoring
chore/<description>      # Build/tooling changes
```

Examples:
- `feature/pdf-compression`
- `fix/drag-drop-windows`
- `docs/readme-translation`

### Git Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types**:
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `style` — Code style (formatting, etc.)
- `refactor` — Code refactoring (no functional change)
- `perf` — Performance improvement
- `test` — Adding/updating tests
- `chore` — Build/tooling changes

**Examples**:
```
feat(pdf): add PDF compression support
fix(image): resolve image rotation on Windows
docs: update README with Docker instructions
```

### Pull Request Workflow

1. **Fork the repository** — Click the Fork button on GitHub
2. **Clone your fork** — `git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git`
3. **Create a branch** — `git checkout -b feature/your-feature`
4. **Make changes** — Implement your feature or fix
5. **Test thoroughly** — Ensure all features work correctly
6. **Commit changes** — Follow the commit convention above
7. **Push to your fork** — `git push origin feature/your-feature`
8. **Create a Pull Request** — From your fork to the main repository
9. **Wait for review** — Address any feedback from maintainers

### Code Style Guidelines

#### Frontend (Vue / TypeScript)

- Use Composition API with `<script setup>`
- Use TypeScript types (avoid `any` when possible)
- Follow Vue 3 style guide recommendations
- Use PascalCase for component names
- Use camelCase for variables and functions
- Use kebab-case for CSS classes (Tailwind utility classes are fine)

#### Backend (Rust)

- Follow standard Rust formatting (`cargo fmt`)
- Run `cargo clippy` before committing
- Add documentation comments for public functions
- Handle errors properly (use `Result`, avoid `unwrap()` in production code)
- Add tests for core functionality

### Setting Up Development Environment

See [Quick Start → Option 1](#option-1-local-development-setup) for detailed setup instructions.

---

## 📝 Changelog

All notable changes to this project will be documented in this section.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [1.0.0] — 2026-07-01

#### Added
- Initial public release
- Text processing tools (replace, dedup, sort, stats, case)
- Codec tools (Base64, URL, Hash, Unicode)
- JSON tools (format, validate, compress)
- Calculator tools (timestamp, base conversion, UUID)
- Image tools (compress, convert, resize, color picker)
- Document conversion tools (Excel, Markdown, encoding)
- PDF tools (merge, split, compress, to images)
- QR code generator and scanner
- Print management (single, batch, queue, printer management)
- Light and dark theme support
- Frosted glass UI design
- Drag and drop file upload
- Portable and installer release builds

#### Known Issues
- OCR features require additional model downloads
- macOS and Linux builds are not yet tested

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Light Office Tools Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📧 Contact

### Maintainers

- **Your Name** — [@YOUR_GITHUB](https://github.com/YOUR_GITHUB)

### Project Links

- **Repository**: [https://github.com/YOUR_USERNAME/YOUR_REPO](https://github.com/YOUR_USERNAME/YOUR_REPO)
- **Issue Tracker**: [https://github.com/YOUR_USERNAME/YOUR_REPO/issues](https://github.com/YOUR_USERNAME/YOUR_REPO/issues)
- **Discussions**: [https://github.com/YOUR_USERNAME/YOUR_REPO/discussions](https://github.com/YOUR_USERNAME/YOUR_REPO/discussions)

### Report Issues

If you encounter any bugs or have feature requests, please [open an issue](https://github.com/YOUR_USERNAME/YOUR_REPO/issues/new) on GitHub with:

1. Clear description of the issue
2. Steps to reproduce
3. Expected behavior
4. Your OS version and application version
5. Screenshots if applicable

---

<div align="center">

**If you find this project helpful, please give it a ⭐ Star!**

Made with ❤️ by the Light Office Tools community

</div>
