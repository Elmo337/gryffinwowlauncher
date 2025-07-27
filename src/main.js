document.addEventListener('DOMContentLoaded', () => {
  const { invoke, event: tauriEvent, window: tauriWindow } = window.__TAURI__;
  const appWindow = tauriWindow.appWindow;

  const downloadBtn = document.getElementById('downloadBtn');
  const playBtn = document.getElementById('playBtn');
  const buttonText = document.getElementById('buttonText');
  const downloadIcon = document.getElementById('downloadIcon');
  const spinner = document.getElementById('spinner');
  const progressPercent = document.getElementById('progressPercent');
  const progressBar = document.getElementById('progressBar');
  const speed = document.getElementById('speed');
  const downloaded = document.getElementById('downloaded');
  const status = document.getElementById('status');

  window.__TAURI__.event.listen("hermes_log", ({ payload }) => {
    const hermesConsole = document.getElementById("hermesConsole");
    hermesConsole.classList.remove("hidden");
    hermesConsole.textContent += payload + "\n";
    hermesConsole.scrollTop = hermesConsole.scrollHeight;
  });

  let selectedRealmInput;
  let realmSelectValue;
  let realmList;

  document.getElementById("minimizeBtn").addEventListener("click", () => {
    appWindow.minimize();
  });

  document.getElementById("closeBtn").addEventListener("click", () => {
    appWindow.close();
  });

  let gameRunning = false;
  let unlisten = null;

  // Tab-Wechsler
  function showTab(tab) {
    document.getElementById("downloadSection").classList.toggle("hidden", tab !== "download");
    document.getElementById("settingsSection").classList.toggle("hidden", tab !== "settings");
    document.getElementById("addonSection").classList.toggle("hidden", tab !== "addon");

    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active-tab"));
    if (tab === "download") {
      document.getElementById("tabDownload").classList.add("active-tab");
    } else if (tab === "settings") {
      document.getElementById("tabSettings").classList.add("active-tab");
    } else if (tab === "addon") {
      document.getElementById("tabAddon").classList.add("active-tab");
      renderAddons(); // <-- wird aufgerufen, wenn Addon-Tab geöffnet wird
    }
  }

  const availableAddons = [
    { name: "Questie", url: "http://31.56.45.75/addons/questie.rar" },
    { name: "Bartender4", url: "http://31.56.45.75/addons/bartender.rar" },
    { name: "VendorPrice", url: "http://31.56.45.75/addons/vendor.rar" },
    { name: "Mapster", url: "http://31.56.45.75/addons/mapster.rar" },
    { name: "Bagnon", url: "http://31.56.45.75/addons/bagnon.rar" }
  ];

  async function renderAddons() {
    const container = document.getElementById("addonList");
    container.innerHTML = "";

    const installedAddons = await window.__TAURI__.invoke("get_installed_addons");

    availableAddons.forEach((addon) => {
      const wrapper = document.createElement("label");
      wrapper.className = "relative flex items-center gap-3 cursor-pointer text-gray-300 mb-2";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = `
        peer
        appearance-none
        h-5 w-5
        border-2 border-gray-600
        rounded
        bg-black bg-opacity-30
        checked:bg-green-600
        checked:border-green-500
        transition-all
        duration-200
      `.replace(/\s+/g, ' ').trim();

      // Vorab markieren, wenn installiert
      if (installedAddons.includes(addon.name)) {
        checkbox.checked = true;
      }

      const checkIcon = document.createElement("span");
      checkIcon.className = `
        pointer-events-none
        absolute left-0 top-0
        flex items-center justify-center
        h-5 w-5
        text-white
        hidden
        peer-checked:flex
      `.replace(/\s+/g, ' ').trim();

      checkIcon.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      `;

      const labelText = document.createElement("span");
      labelText.className = "pl-6";
      labelText.textContent = addon.name;

      checkbox.addEventListener("change", async () => {
        if (checkbox.checked) {
          await window.__TAURI__.invoke("install_addon", { entry: addon });
        } else {
          await window.__TAURI__.invoke("uninstall_addon", { name: addon.name });
        }
      });

      wrapper.appendChild(checkbox);
      wrapper.appendChild(checkIcon);
      wrapper.appendChild(labelText);
      container.appendChild(wrapper);
    });
  }


  document.getElementById("openAddonBtn").addEventListener("click", async () => {
    try {
        await window.__TAURI__.invoke("open_addon_folder");
    } catch (error) {
        alert("Konnte den Addon-Ordner nicht öffnen.");
        console.error(error);
    }
    });

  document.getElementById("tabDownload").addEventListener("click", () => showTab("download"));
  document.getElementById("tabSettings").addEventListener("click", () => showTab("settings"));
  document.getElementById("tabAddon").addEventListener("click", () => showTab("addon"));

  // Realmlist laden
  async function loadRealmlists() {
    const realms = await invoke("load_realmlists");
    realmList = document.getElementById("realmList");
    const realmLabel = document.getElementById("realmLabel");
    realmSelectValue = document.getElementById("realmSelectValue");
    selectedRealmInput = document.getElementById("selectedRealm");

    const savedRealm = localStorage.getItem("selectedRealm") || "";

    realmList.innerHTML = "";

    function createRealmItem(name, address) {
      const li = document.createElement("li");
      li.textContent = `${name} (${address})`;
      li.dataset.value = address;

      li.style.padding = "10px 12px";
      li.style.cursor = "pointer";
      li.style.backgroundColor = "16 16 18 / 23%";
      li.style.color = "#888";
      li.style.borderBottom = "1px solid #222";
      li.style.transition = "all 0.2s ease";
      li.style.userSelect = "none";

      // Hover
      li.addEventListener("mouseenter", () => {
        li.style.backgroundColor = "16 16 18 / 23%";
        li.style.color = "#ddd";
      });
      li.addEventListener("mouseleave", () => {
        if (!li.classList.contains("selected")) {
          li.style.backgroundColor = "16 16 18 / 23%";
          li.style.color = "#888";
        }
      });

      // Klick / Auswahl
      li.addEventListener("click", () => {
        document.querySelectorAll("#realmList li").forEach(el => {
          el.classList.remove("selected");
          el.style.backgroundColor = "16 16 18 / 23%";
          el.style.color = "#888";
        });

        li.classList.add("selected");
        li.style.backgroundColor = "16 16 18 / 23%";
        li.style.color = "16 16 18 / 23%";

        realmSelectValue.textContent = `${name} (${address})`;
        selectedRealmInput.value = address;

        // 🔒 Auswahl speichern
        localStorage.setItem("selectedRealm", address);

        realmList.classList.add("hidden");
      });

      // 🔁 Wiederherstellen der vorherigen Auswahl
      if (address === savedRealm) {
        li.classList.add("selected");
        li.style.backgroundColor = "16 16 18 / 23%";
        li.style.color = "16 16 18 / 23%";
        realmSelectValue.textContent = `${name} (${address})`;
        selectedRealmInput.value = address;
      }

      return li;
    }

    // Fester Realm immer zuerst
    realmList.appendChild(createRealmItem("GryffinWoW", "gryffinwow.com"));

    realms.forEach(r => {
      realmList.appendChild(createRealmItem(r.name, r.address));
    });

    // Nur einmal registrieren!
    if (!realmLabel.classList.contains("bound")) {
      realmLabel.addEventListener("click", () => {
        realmList.classList.toggle("hidden");
      });
      realmLabel.classList.add("bound"); // nicht doppelt binden
    }
  }

  // 🔥 Delete-Button aktivieren
  document.getElementById("deleteRealmBtn").onclick = async () => {
    const selectedRealm = selectedRealmInput.value;


    if (!selectedRealm) {
      errorMsg.classList.remove("hidden");
      errorMsg.textContent = "❌ Please select realm";

      setTimeout(() => {
        errorMsg.classList.add("hidden");
      }, 3000);

      return;
    }

    if (selectedRealm === "gryffinwow.com") {
      errorMsg.classList.remove("hidden");
      errorMsg.textContent = "❌ Standard Realm cant be deleted";

      setTimeout(() => {
        errorMsg.classList.add("hidden");
      }, 3000);

      return;
    }

    try {
      await invoke("delete_realmlist", { address: selectedRealm });
      console.log("✅ Gelöscht:", selectedRealm);

      // Nach dem Löschen neu laden
      await loadRealmlists();

      // 🔁 Prüfen, ob gelöschter Realm noch existiert
      const remaining = await invoke("load_realmlists");
      const stillExists = remaining.some(r => r.address === selectedRealm);

      if (!stillExists) {
        selectedRealmInput.value = "";
        realmSelectValue.textContent = "Select realm";
      } else {
        // Realm wurde nicht gelöscht? (sollte nicht passieren)
        console.warn("Realm existiert nach Löschung noch?");
      }

    } catch (err) {
      alert("Fehler beim Löschen: " + err);
      console.error(err);
    }
  };

  loadRealmlists();


  // Realm speichern
  document.getElementById("saveRealmBtn").addEventListener("click", async () => {
    const name = document.getElementById("realmName").value;
    const address = document.getElementById("realmAddress").value;
    if (!name || !address) {
      errorMsg.classList.remove("hidden");
      errorMsg.textContent = "❌ Fill both Fields";

      setTimeout(() => {
        errorMsg.classList.add("hidden");
      }, 3000);

      return;
    }
      

    await invoke("save_realmlist", { entry: { name, address } });
    await loadRealmlists();

    // 🧠 Direkt neu gesetzten Realm aktivieren
    localStorage.setItem("selectedRealm", address);
    document.getElementById("selectedRealm").value = address;
    document.getElementById("realmSelectValue").textContent = `${name} (${address})`;

    // Optional: Reset input fields
    document.getElementById("realmName").value = "";
    document.getElementById("realmAddress").value = "";

    // Zurück zur Download-Ansicht
    showTab("download");
  });

  // Spiel starten
  playBtn.addEventListener("click", async () => {
    const selectedRealm = document.getElementById("selectedRealm").value;
    const errorMsg = document.getElementById("realmError");

    if (!selectedRealm) {
      errorMsg.classList.remove("hidden");
      errorMsg.textContent = "❌ Please Choose a Realmlist";

      setTimeout(() => {
        errorMsg.classList.add("hidden");
      }, 3000);

      return;
    }


    if (!gameRunning) {
      status.textContent = "Game starting...";
      await invoke("start_game", { realm: selectedRealm });
      console.log("Starte Spiel mit Realm:", selectedRealmAddress);
    } else {
      status.textContent = "Game closing...";
      await invoke("stop_game");
    }

    showTab("download");
  });

  // Spielzustand-Events
  tauriEvent.listen("game_started", () => {
    gameRunning = true;
    playBtn.textContent = "Close Game";
    status.textContent = "Game is running";

    // Button visuell rot machen
    playBtn.classList.remove("bg-green-600", "hover:bg-green-700");
    playBtn.classList.add("bg-red-600", "hover:bg-red-700");
  });

  tauriEvent.listen("game_stopped", () => {
    gameRunning = false;
    playBtn.textContent = "Start Game";
    status.textContent = "Game closed";

    // Button wieder grün machen
    playBtn.classList.remove("bg-red-600", "hover:bg-red-700");
    playBtn.classList.add("bg-green-600", "hover:bg-green-700");
  });

  // Download starten
  downloadBtn.addEventListener('click', async () => {
    try {
      downloadBtn.disabled = true;
      buttonText.textContent = "Getting patched...";
      downloadIcon.classList.add('hidden');
      spinner.classList.remove('hidden');
      status.textContent = "Getting patched...";

      unlisten = await tauriEvent.listen('download_progress', ({ payload }) => {
        progressPercent.textContent = `${payload.percent.toFixed(1)}%`;
        progressBar.style.width = `${payload.percent}%`;
        speed.textContent = `${payload.speed} KB/s`;
        downloaded.textContent = `${payload.downloaded} MB of ${payload.total} MB`;
        status.textContent = "Downloading...";
      });

      await invoke('start_download');

      // UI nach Erfolg anpassen
      status.textContent = "✅ Download successful!";
      playBtn.classList.remove('hidden');
      downloadBtn.classList.add('hidden');
      progressInfo.classList.add('hidden');
      fileStatus.classList.add("hidden");

      progressPercent.textContent = "";
      progressBar.style.width = "0%";
      speed.textContent = "";
      downloaded.textContent = "";

      // Extra Events
      await tauriEvent.listen('extract_success', () => {
        status.textContent = "Files extracted!";
      });

      await tauriEvent.listen('extract_error', ({ payload }) => {
        status.textContent = `Error extracting: ${payload.error}`;
      });

    } catch (error) {
      status.textContent = `Error: ${error.message}`;
      console.error("Download failed:", error);
    } finally {
      if (unlisten) await unlisten();
      downloadBtn.disabled = false;
      downloadIcon.classList.remove('hidden');
      spinner.classList.add('hidden');
    }
  });

  const CURRENT_LAUNCHER_VERSION = "0.6.0";

  async function checkLauncherUpdate() {
    try {
      const updateUrl = await window.__TAURI__.invoke("check_launcher_update_url", {
        currentVersion: CURRENT_LAUNCHER_VERSION,
      });

      if (updateUrl) {
        const box = document.getElementById("updateBox");
        box.classList.remove("hidden");

        const btn = document.getElementById("updateNowBtn");
        btn.onclick = () => {
          downloadAndUpdateWithProgress(updateUrl);
        };
      }
    } catch (e) {
      console.error("Fehler beim Update-Check:", e);
    }
  }

  async function downloadAndUpdateWithProgress(updateUrl) {
    try {
      const progressBar = document.getElementById("updateProgressBar");
      const percentText = document.getElementById("updatePercent");

      progressBar.style.width = "0%";
      percentText.textContent = "0%";

      await window.__TAURI__.invoke("download_and_update_launcher");

      alert("Update wird installiert...");
    } catch (err) {
      console.error("❌ Fehler beim Update:", err);
      alert("Fehler beim Herunterladen des Updates.");
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    checkLauncherUpdate();
  });

  // Dateien prüfen bei Start
  invoke("check_required_files")
    .then(([filesOkay, message]) => {
      const playBtn = document.getElementById('playBtn');
      const downloadBtn = document.getElementById('downloadBtn');
      const progressInfo = document.getElementById('progressInfo');
      const fileStatus = document.getElementById('fileStatus'); // <== Änderung hier!

      fileStatus.classList.remove("hidden");
      fileStatus.textContent = filesOkay ? `✅ ${message}` : `❌ ${message}`;

      if (filesOkay) {
        fileStatus.classList.add("text-green-400");
        fileStatus.classList.remove("text-red-400");
        playBtn.classList.remove('hidden');
        downloadBtn.classList.add('hidden');
        progressInfo.classList.add('hidden');
      } else {
        fileStatus.classList.add("text-red-400");
        fileStatus.classList.remove("text-green-400");
        playBtn.classList.add('hidden');
        downloadBtn.classList.remove('hidden');
        progressInfo.classList.remove('hidden');
      }
    })
    .catch((err) => {
      console.error("Fehler beim Überprüfen der Spieldateien:", err);
    });

  invoke("stop_game").catch(console.error);
});
