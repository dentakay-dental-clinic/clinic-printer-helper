# Clinic Print Helper

A Tauri 2 desktop app for clinic front desk staff to print appointment labels on an **Argox OS-214plus** thermal label printer.

Built with Next.js (static export) inside a Tauri WebView.

---

## Running on Windows

### Requirements
- [Node.js](https://nodejs.org) LTS
- [Rust](https://rustup.rs)
- Argox OS-214plus driver installed

### Setup
```bash
npm install
npx tauri dev
```

For a production build:
```bash
npm run build
npx tauri build
```

---

## Running on Mac (testing)

### 1. Install tools

```bash
# Xcode command line tools
xcode-select --install
```

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Press Enter for default install, then restart Terminal
```

Install [Node.js LTS](https://nodejs.org) from the website, or via Homebrew:
```bash
brew install node
```

### 2. Clone and install

```bash
git clone https://github.com/jgigrec323/printer-helper.git
cd printer-helper
npm install
```

### 3. Run

```bash
npx tauri dev
```

First run takes 5–10 minutes (Rust compiles). After that it's fast.

> **macOS note:** If macOS blocks the app with "unidentified developer", right-click the app → **Open** instead of double-clicking. One-time only.

### What works on Mac

| Feature | Status |
|---|---|
| App opens, UI loads | Works |
| Navigation (setup, appointments, settings) | Works |
| Fetching appointments from the API | Works |
| Printer list in settings | Not yet (Windows-only) |
| Printing labels | Not yet (Windows-only) |

---

## Architecture

- **Frontend:** Next.js static export (`/out/`) served by Tauri WebView
- **Printing (Windows):** Rust GDI API via Tauri commands — bypasses print dialog, sends directly to Argox driver
- **Printing (Mac):** Planned — will use `window.print()` via macOS CUPS driver
- **State:** Two React contexts — `ClinicConfigContext` (settings) and `AppointmentsContext` (appointments + filters)
- **Storage:** `localStorage` (swap path to `tauri-plugin-store` planned)
- **Label size:** 57mm × 27mm — set in `app/globals.css` `@page`

## Commands

```bash
npm run dev        # Next.js dev server
npm run build      # Static export to /out/
npm run lint       # ESLint
npx tauri dev      # Desktop app (dev mode)
npx tauri build    # Build installer
```
