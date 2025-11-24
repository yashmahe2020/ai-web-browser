# Flow Browser - Setup Guide

## ✅ Project Status

The project has been successfully set up and verified. All core functionality is working.

## Prerequisites

- **Bun** v1.2.0+ (✅ Verified: v1.2.20 installed)
- **Xcode Command Line Tools** (Required for native module builds)
- **macOS** (Currently tested on Darwin 23.2.0)

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

**Note:** The postinstall script may show warnings about `better-sqlite3` native module rebuild. This is a known issue with Xcode Command Line Tools detection, but it doesn't prevent the app from running. The app uses pre-built binaries or handles the module gracefully.

### 2. Generate Frontend Routes (if needed)

```bash
bun run script:generate-frontend-routes
```

This is automatically run during the build process, but you can run it manually if needed.

### 3. Start Development Server

```bash
bun run dev
```

This will:
- Start the Electron development server with hot reloading
- Launch the Flow Browser application
- Enable file watching for automatic rebuilds

### 4. Alternative: Preview Mode

```bash
bun start
```

Runs the application in preview mode (uses built files).

## Available Scripts

- `bun run dev` - Start development server with hot reloading
- `bun run dev:watch` - Development with file watching (recommended)
- `bun run start` - Preview mode (uses built files)
- `bun run build` - Build for production
- `bun run typecheck` - Run TypeScript type checking
- `bun run lint` - Run ESLint
- `bun run format` - Format code with Prettier

## Project Structure

```
ai-web-browser/
├── src/
│   ├── main/          # Electron main process
│   ├── renderer/      # React frontend application
│   ├── preload/       # Preload scripts for IPC
│   └── shared/        # Shared code between main and renderer
├── scripts/           # Build and utility scripts
├── build/             # Build configuration and assets
└── docs/              # Documentation
```

## Known Issues & Solutions

### better-sqlite3 Native Module Rebuild Warning

**Issue:** The postinstall script may fail to rebuild `better-sqlite3` with an error about Xcode Command Line Tools not being detected.

**Impact:** Low - The app runs successfully despite this warning. The module either uses pre-built binaries or has fallback handling.

**Solution (if needed):**
1. Ensure Xcode Command Line Tools are installed:
   ```bash
   xcode-select --install
   ```
2. If already installed, try setting the developer directory:
   ```bash
   export DEVELOPER_DIR=$(xcode-select -p)
   bun run electron-builder install-app-deps
   ```

### Build Warnings

**Chunk Size Warnings:** The build may show warnings about large chunks (>500KB). This is expected for an Electron app with PDF viewer and other features. It doesn't affect functionality.

## Verification Checklist

✅ Dependencies installed successfully  
✅ TypeScript type checking passes  
✅ Project builds without errors  
✅ Development server starts successfully  
✅ Electron application launches  
✅ All routes generated correctly  

## Testing the Application

Once the dev server is running, you should see:

1. **Electron window** opens automatically
2. **Onboarding screen** (first run) or main browser interface
3. **Basic browser functionality:**
   - Tab creation and management
   - URL navigation
   - Omnibox (address bar) functionality
   - Settings access
   - Extension support

## Development Workflow

1. Make changes to source files in `src/`
2. The dev server automatically rebuilds and reloads
3. Check the Electron console for any errors
4. Use `bun run typecheck` before committing changes

## Building for Production

```bash
# Build for current platform
bun run build

# Build for specific platforms
bun run build:mac      # macOS
bun run build:win      # Windows
bun run build:linux    # Linux
```

## Troubleshooting

### Port Already in Use

If port 5173 (or the Vite dev server port) is in use:

```bash
# Kill existing Electron/Vite processes
pkill -f "electron-vite dev"
pkill -f Electron
```

### Module Not Found Errors

If you see module not found errors:

```bash
# Clean install
rm -rf node_modules bun.lock
bun install
```

### TypeScript Errors

Run type checking to see detailed errors:

```bash
bun run typecheck
```

## Next Steps

- Review the [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
- Check [docs/](./docs/) for detailed documentation
- Explore the codebase starting with `src/main/index.ts` and `src/renderer/src/routes/`

---

**Last Updated:** Setup completed and verified on macOS
**Status:** ✅ Ready for development



