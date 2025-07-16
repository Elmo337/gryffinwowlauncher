# Gryffin WoW Launcher

A modern World of Warcraft 1.14.2 launcher with integrated Hermes Proxy support — built specifically for **Gryffin WoW**.

---

## ⚙️ Features

- ✔️ Compatible with WoW Classic 1.14.2 (Build 42597)
- 🔌 Built-in [Hermes Proxy](https://github.com/wowdev/hermes-proxy) for seamless connection to the private server
- 💻 Cross-platform launcher using [Tauri](https://tauri.app)
- 🎮 Automatically launches `Wow.exe` after establishing a connection
- 🧰 Optional: Auto-patcher, news system, and Blizzard-style UI (customizable)

---

## 🧪 Development Mode

```bash
npm run tauri dev
Launches the app in development mode — ideal for UI and connection testing.

📦 Build Mode
bash
Kopieren
Bearbeiten
npm run tauri build
Builds a production-ready version of the launcher for end-users (EXE, AppImage, or DMG depending on platform).

🖥 Requirements
Node.js v18+

Rust

Tauri CLI:

bash
Kopieren
Bearbeiten
cargo install tauri-cli
Git (required for building and version control)

🌐 Connection
The launcher connects automatically through Hermes Proxy to the Gryffin WoW private server (1.14.2 compatible).
The hermesproxy.config file is preconfigured — no additional setup needed.

🧩 Notes
By default, Wow.exe is launched from the unpacked win.rar game directory.

Launcher updates and patches are supported via the optional patching system.

Ensure the launcher has write permissions to the installation folder.
