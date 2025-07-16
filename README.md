# IMPORTANT NOTICE

THIS CLIENT IS **NOT** OFFICIALLY ASSOCIATED WITH **GRYFFINWOW**.
IT IS A CUSTOM LAUNCHER PROVIDED "AS IS" FOR TESTING AND PERSONAL USE ONLY.
GRYFFINWOW DOES **NOT** ENDORSE, MAINTAIN, OR SUPPORT THIS LAUNCHER.

---

## ⚙️ Features

- ✔️ Compatible with **WoW Classic 1.14.2 (Build 42597)**
- 🔌 Built-in [Hermes Proxy](https://github.com/wowdev/hermes-proxy) for seamless server connection
- 💻 Cross-platform using [Tauri](https://tauri.app)
- 🎮 Auto-starts `Wow.exe` after successful connection

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

---

## 💬 Support

Need help or have suggestions?  
→ Join our Discord: [https://discord.gg/gryffinwow](https://discord.gg/gryffinwow)  
Or contact the Gryffin WoW dev team directly.
