
- ✔️ Fully compatible with WoW Classic 1.14.2 (Build 42597)
- 🔌 Integrated Hermes Proxy for seamless server connections
- 🖥️ Cross-platform launcher built with Tauri – lightweight, fast, and native
- 🌐 Realmlist Manager – easily switch between multiple servers with one click
- 📦 Built-in Addon Downloader – install recommended addons directly from the launcher
- 📁 Open Folder Button – quickly access your WoW directory for manual adjustments
- 🧪 File Integrity Checker – verifies required files and ensures your installation is complete (including minimum file size checks)
- 🎨 Modern, custom UI – sleek dark-themed design with tailored styling and interactive tabs
- 📥 Smart Downloader – automatic .rar unpacking, progress tracking, and re-download safety handling
- 🔄 Auto Updater

---

## Install

To run the initial install
```bash
npm install tauri
`````

## 🧪 Development Mode

To run the launcher in development mode:
```bash
npm run tauri dev
`````

---

## 📦 Build Mode

To build a production-ready version:
```bash
npm run tauri build
`````

---

## 🖥 Requirements

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://www.rust-lang.org/tools/install)
- Tauri CLI: cargo install tauri-cli
- Git (required for building and version control)

---

## 🌐 Connection

The launcher connects automatically via **Hermes Proxy** to the Gryffin WoW private server (1.14.2 compatible).  
The `hermesproxy.config` file is preconfigured — no additional setup needed.

---

## 🧩 Notes

- Default launch path is `Wow.exe` from the unpacked `win.rar` directory.
- Launcher supports patching and updates via the internal patch system (optional).
- Make sure the user has **write access** to the game directory.
- Folder access are in *%appdata%/gryffin*
