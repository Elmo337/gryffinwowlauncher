#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use tokio::sync::Mutex;
use tauri::Window;
use futures_util::StreamExt;
use std::{sync::Arc, time::Instant, fs::File, io::Write, process::Command};
use std::time::Duration;
use tokio::time::sleep;
use std::fs::{OpenOptions};
use std::io::{BufReader, BufRead};
use std::path::Path;
use std::fs::{self};
use std::os::windows::process::CommandExt;
use std::process::Stdio;
use std::thread;


#[derive(Default)]
struct DownloadState {
    active: bool,
}

fn gryffin_dir() -> Result<std::path::PathBuf, String> {
    let appdata = std::env::var("APPDATA")
        .map_err(|e| format!("APPDATA konnte nicht ermittelt werden: {}", e))?;
    let path = Path::new(&appdata).join("gryffin");

    // Ordner anlegen, falls nicht vorhanden
    fs::create_dir_all(&path)
        .map_err(|e| format!("gryffin-Verzeichnis konnte nicht erstellt werden: {}", e))?;

    Ok(path)
}

use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct RealmEntry {
    pub name: String,
    pub address: String,
}

#[tauri::command]
fn load_realmlists() -> Result<Vec<RealmEntry>, String> {
    let path = gryffin_dir()?.join("realmlists.json");
    if !path.exists() {
        return Ok(vec![]);
    }
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_realmlist(entry: RealmEntry) -> Result<(), String> {
    let path = gryffin_dir()?.join("realmlists.json");
    let mut entries = if path.exists() {
        let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        vec![]
    };

    if !entries.iter().any(|e: &RealmEntry| e.name == entry.name) {
        entries.push(entry);
    }

    let json = serde_json::to_string_pretty(&entries).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_realmlist(address: String) -> Result<(), String> {
    let path = gryffin_dir()?.join("realmlists.json");

    if !path.exists() {
        return Ok(()); // Nichts zu löschen
    }

    let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut realms: Vec<RealmEntry> = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    let address_clean = address.trim().to_lowercase();
    let original_len = realms.len();

    realms.retain(|r| r.address.trim().to_lowercase() != address_clean);

    println!("🗑️ Lösche Realm: {}", address_clean);
    println!("Vorher: {}, Nachher: {}", original_len, realms.len());

    let new_data = serde_json::to_string_pretty(&realms).map_err(|e| e.to_string())?;
    fs::write(&path, new_data).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn open_addon_folder() -> Result<(), String> {
    let base_dir = gryffin_dir()?;
    let addons_path = base_dir
        .join("World of Warcraft")
        .join("_classic_era_")
        .join("Interface")
        .join("AddOns");

    fs::create_dir_all(&addons_path).map_err(|e| format!("Ordner konnte nicht erstellt werden: {}", e))?;

    // Öffne den Ordner im Explorer
    Command::new("explorer")
        .arg(addons_path)
        .spawn()
        .map_err(|e| format!("Explorer konnte nicht geöffnet werden: {}", e))?;

    Ok(())
}

#[tauri::command]
fn check_required_files() -> Result<bool, String> {
    let dir = gryffin_dir()?;

    // Liste der Dateien, die vorhanden sein müssen
    let required_files = vec![
        "World of Warcraft",
        "Hermes",
        "unrar.exe",
    ];

    for file in required_files {
        let path = dir.join(file);
        if !path.exists() {
            return Ok(false); // Mindestens eine Datei fehlt
        }
    }

    Ok(true) // Alle Dateien vorhanden
}

#[tauri::command]
fn get_installed_addons() -> Result<Vec<String>, String> {
    let addon_dir = gryffin_dir()?.join("World of Warcraft/_classic_era_/Interface/AddOns");

    if !addon_dir.exists() {
        return Ok(vec![]);
    }

    let entries = fs::read_dir(addon_dir).map_err(|e| e.to_string())?;
    let mut installed = vec![];

    for entry in entries {
        if let Ok(entry) = entry {
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    installed.push(name.to_string());
                }
            }
        }
    }

    Ok(installed)
}

fn move_executable_to_wow_folder() -> Result<(), String> {
    let download_dir = gryffin_dir()?;

    let source = download_dir.join("WowClassic_ForCustomServers.exe");
    let target_dir = download_dir.join("World of Warcraft").join("_classic_era_");

    // Zielverzeichnis erstellen, falls nicht vorhanden
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Zielordner konnte nicht erstellt werden: {}", e))?;

    let target = target_dir.join("WowClassic_ForCustomServers.exe");

    // Datei verschieben
    fs::rename(&source, &target)
        .map_err(|e| format!("Konnte Datei nicht verschieben: {}", e))?;

    println!("🚀 Executable verschoben nach: {:?}", target);
    Ok(())
}

fn configure_wow_settings(wow_path: &Path) -> Result<(), String> {
    let config_path = wow_path.join("WTF").join("Config.wtf");

    // Datei und Ordner erstellen, falls nicht vorhanden
    if !config_path.exists() {
        fs::create_dir_all(config_path.parent().unwrap()).map_err(|e| e.to_string())?;
        fs::File::create(&config_path).map_err(|e| e.to_string())?;
    }

    // Vorhandene Zeilen einlesen und bearbeiten
    let file = fs::File::open(&config_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let mut lines = Vec::new();
    let mut has_portal = false;
    let mut has_realmlist = false;

    for line in reader.lines().flatten() {
        if line.contains("SET portal") {
            lines.push(r#"SET portal "127.0.0.1:1119""#.to_string());
            has_portal = true;
        } else if line.contains("SET realmlist") {
            lines.push(r#"SET realmlist "127.0.0.1""#.to_string());
            has_realmlist = true;
        } else {
            lines.push(line);
        }
    }

    // Falls noch nicht vorhanden, hinzufügen
    if !has_portal {
        lines.push(r#"SET portal "127.0.0.1:1119""#.to_string());
    }
    if !has_realmlist {
        lines.push(r#"SET realmlist "127.0.0.1""#.to_string());
    }

    // Datei überschreiben
    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(&config_path)
        .map_err(|e| e.to_string())?;

    for line in lines {
        writeln!(file, "{}", line).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn extract_rar(_window: Window, archive_path: &str, extract_to: &str) -> Result<(), String> {
    let download_dir = gryffin_dir()?;
    let unrar_path = download_dir.join("unrar.exe");
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    println!("🧪 Starte Entpacken mit: {:?} -> {}", unrar_path, archive_path);

    let output = Command::new(unrar_path)
        .args(["x", "-y", archive_path, extract_to])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Fehler beim Ausführen von unrar: {}", e))?;

    println!("Status: {}", output.status);
    println!("stdout:\n{}", String::from_utf8_lossy(&output.stdout));
    println!("stderr:\n{}", String::from_utf8_lossy(&output.stderr));

    if output.status.success() {
        println!("✅ Erfolgreich entpackt!");

        // Nur gezielte Archive löschen
        let archive_filename = Path::new(archive_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default();

        match archive_filename {
            "win.rar" | "Hermes.rar" => {
                fs::remove_file(archive_path)
                    .map_err(|e| format!("Fehler beim Löschen von '{}': {}", archive_path, e))?;
                println!("🗑️ Archiv '{}' gelöscht.", archive_filename);
            }
            _ => {
                println!("🧐 Archiv '{}' bleibt erhalten.", archive_filename);
            }
        }

        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Entpackfehler: {}", stderr))
    }
}

#[tauri::command]
fn stop_game(window: tauri::Window) -> Result<(), String> {
    let mut system = sysinfo::System::new_all();
    system.refresh_processes();

    let targets = ["HermesProxy.exe", "WowClassic_ForCustomServers.exe"];

    for (_pid, process) in system.processes() {
        let name = process.name();
        if targets.contains(&name) {
            println!("🛑 Beende Prozess: {}", name);
            process.kill();
        }
    }

    window.emit("game_stopped", {}).ok();
    Ok(())
}

#[derive(serde::Deserialize)]
pub struct AddonEntry {
    name: String,
    url: String,
}

#[tauri::command]
async fn install_addon(entry: AddonEntry, window: Window) -> Result<(), String> {
    let gryffin = gryffin_dir()?;
    let addon_dir = gryffin.join("World of Warcraft/_classic_era_/Interface/AddOns");
    let rar_path = addon_dir.join(format!("{}.rar", entry.name));

    // Download
    let response = reqwest::get(&entry.url).await.map_err(|e| e.to_string())?;
    let content = response.bytes().await.map_err(|e| e.to_string())?;
    fs::create_dir_all(&addon_dir).ok();
    fs::write(&rar_path, &content).map_err(|e| e.to_string())?;

    // Entpacken mit unrar
    let unrar = gryffin.join("unrar.exe");
    let extract_to = addon_dir.to_string_lossy().to_string();

    let output = Command::new(unrar)
        .args(["x", "-y", &rar_path.to_string_lossy(), &extract_to])
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| format!("Fehler beim Entpacken: {}", e))?;

    if !output.status.success() {
        return Err("Entpacken fehlgeschlagen".into());
    }

    fs::remove_file(&rar_path).ok();
    window.emit("addon_installed", entry.name.clone()).ok();
    Ok(())
}

#[tauri::command]
fn uninstall_addon(name: String) -> Result<(), String> {
    let path = gryffin_dir()?
        .join("World of Warcraft/_classic_era_/Interface/AddOns")
        .join(&name);

    if path.exists() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
    }

    Ok(())
}


#[tauri::command]
async fn start_game(window: Window, realm: String) -> Result<(), String> {
    let base_dir = gryffin_dir()?;
    let hermes_dir = base_dir.join("Hermes");
    let game_dir = base_dir.join("World of Warcraft/_classic_era_");

    let hermes_exe = hermes_dir.join("HermesProxy.exe");
    let game_exe = game_dir.join("WowClassic_ForCustomServers.exe");

    configure_wow_settings(&game_dir)?;
    move_executable_to_wow_folder().ok();

    const CREATE_NO_WINDOW: u32 = 0x08000000;

    // 🧪 Starte HermesProxy mit Live-Logübertragung
    let mut child = Command::new(&hermes_exe)
        .current_dir(&hermes_dir)
        .arg("--set")
        .arg(format!("ServerAddress={}", realm))
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Hermes konnte nicht gestartet werden: {}", e))?;

    // Logs auslesen
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let win_clone = window.clone();

    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            win_clone.emit("hermes_log", line).ok();
        }
    });

    let win_clone2 = window.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            win_clone2.emit("hermes_log", format!("[stderr] {}", line)).ok();
        }
    });

    window.emit("hermes_started", {}).ok();

    sleep(Duration::from_secs(5)).await;

    Command::new(&game_exe)
        .current_dir(&game_dir)
        .spawn()
        .map_err(|e| format!("Spiel konnte nicht gestartet werden: {}", e))?;

    window.emit("game_started", {}).ok();
    Ok(())
}

#[tauri::command]
async fn start_download(
    window: tauri::Window,
    state: tauri::State<'_, Arc<Mutex<DownloadState>>>,
) -> Result<(), String> {
    let mut state_guard = state.lock().await;
    if state_guard.active {
        return Err("Download läuft bereits".into());
    }
    state_guard.active = true;
    drop(state_guard);

    let download_urls = vec![
        ("http://31.56.45.75/unrar.exe", "unrar.exe"),
        ("http://31.56.45.75/WowClassic_ForCustomServers.exe", "WowClassic_ForCustomServers.exe"),
        ("https://gryffin-wow.ams3.cdn.digitaloceanspaces.com/WoW%20Classic%201.14.2.42597%20All%20Languages.rar", "win.rar"),
        ("http://31.56.45.75/Hermes.rar", "Hermes.rar"),
    ];

    let client = Client::new();
    let download_base_dir = gryffin_dir()?;
    let start_time = Instant::now();

    for (url, filename) in download_urls {
        let download_path = download_base_dir.join(filename);

        // Datei-Check: Wenn Datei schon existiert, überspringen
        if download_path.exists() {
            println!("⏩ Datei bereits vorhanden, überspringe: {}", filename);
            window.emit("download_skipped", serde_json::json!({ "file": filename })).ok();
            
            // Trotzdem entpacken, falls nötig
            let archive_str = download_path.to_string_lossy();
            let extract_to = download_path
                .parent()
                .ok_or("Zielverzeichnis für Entpacken konnte nicht ermittelt werden")?
                .to_string_lossy();

            match extract_rar(window.clone(), &archive_str, &extract_to) {
                Ok(_) => {
                    window.emit("extract_success", serde_json::json!({ "file": filename })).ok();
                },
                Err(err) => {
                    window.emit("extract_error", serde_json::json!({ "file": filename, "error": err })).ok();
                }
            }
            continue;
        }

        // Download starten
        println!("⬇️ Starte Download: {} -> {:?}", url, download_path);
        let res = client.get(url)
            .send()
            .await
            .map_err(|e| format!("Download fehlgeschlagen für {}: {}", filename, e))?;

        let total_size = res.content_length().unwrap_or(0);
        let mut downloaded: u64 = 0;
        let mut stream = res.bytes_stream();
        let mut last_update = Instant::now();

        let mut file = File::create(&download_path)
            .map_err(|e| format!("Datei konnte nicht erstellt werden: {}", e))?;

        while let Some(item) = stream.next().await {
            let chunk = item.map_err(|e| format!("Datenfehler: {}", e))?;

            file.write_all(&chunk)
                .map_err(|e| format!("Fehler beim Schreiben in Datei: {}", e))?;

            downloaded += chunk.len() as u64;

            if last_update.elapsed().as_millis() > 200 {
                let elapsed = start_time.elapsed().as_secs_f64();
                let speed_kbps = (downloaded as f64 / 1024.0) / elapsed;
                let progress = if total_size > 0 {
                    (downloaded as f64 / total_size as f64) * 100.0
                } else {
                    0.0
                };

                window.emit("download_progress", 
                    serde_json::json!({
                        "file": filename,
                        "percent": progress,
                        "speed": speed_kbps.round(),
                        "downloaded": (downloaded / 1024 / 1024),
                        "total": (total_size / 1024 / 1024)
                    })
                ).map_err(|e| format!("Kommunikationsfehler: {}", e))?;

                last_update = Instant::now();
            }
        }
        drop(file);

        println!("✅ Download abgeschlossen: {:?}", download_path);

        // Danach entpacken
        let archive_str = download_path.to_string_lossy();
        let extract_to = download_path
            .parent()
            .ok_or("Zielverzeichnis für Entpacken konnte nicht ermittelt werden")?
            .to_string_lossy();

        match extract_rar(window.clone(), &archive_str, &extract_to) {
            Ok(_) => {
                window.emit("extract_success", serde_json::json!({ "file": filename })).ok();
                move_executable_to_wow_folder().ok(); // Fehler optional ignorieren
            },
            Err(err) => {
                window.emit("extract_error", serde_json::json!({ "file": filename, "error": err })).ok();
            }
        }
    }

    state.lock().await.active = false;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(Mutex::new(DownloadState { active: false })))
        .invoke_handler(tauri::generate_handler![start_download, check_required_files, start_game, stop_game, load_realmlists, save_realmlist, open_addon_folder, delete_realmlist, install_addon, uninstall_addon, get_installed_addons])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Tauri Anwendung");
}