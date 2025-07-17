document.addEventListener('DOMContentLoaded', () => {
  const { invoke, event: tauriEvent } = window.__TAURI__;

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
    { name: "Atlas_ClassicWoW", url: "http://31.56.45.75/addons/atlas.rar" },
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
    const select = document.getElementById("realmSelect");

    select.innerHTML = "";

    // 🔐 Fester Eintrag: gryffinwow.com
    const gryffinOption = document.createElement("option");
    gryffinOption.value = "gryffinwow.com";
    gryffinOption.textContent = "GryffinWoW (gryffinwow.com)";
    select.appendChild(gryffinOption);

    // 🔁 Dann alle gespeicherten Realms anhängen
    realms.forEach(r => {
        const option = document.createElement("option");
        option.value = r.address;
        option.textContent = `${r.name} (${r.address})`;
        select.appendChild(option);
    });
  }

  document.getElementById("deleteRealmBtn").addEventListener("click", async () => {
    const select = document.getElementById("realmSelect");
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption) return alert("Please select a realm to delete");

    const realmName = selectedOption.textContent.split(" (")[0]; // Nur den Namen extrahieren

    if (confirm(`Delete realm "${realmName}"?`)) {
        await invoke("delete_realmlist", { name: realmName });
        await loadRealmlists();
    }
  });

  loadRealmlists();

  // Realm speichern
  document.getElementById("saveRealmBtn").addEventListener("click", async () => {
    const name = document.getElementById("realmName").value;
    const address = document.getElementById("realmAddress").value;
    if (!name || !address) return alert("Please enter both name and address");

    await invoke("save_realmlist", { entry: { name, address } });
    await loadRealmlists();

    document.getElementById("realmName").value = "";
    document.getElementById("realmAddress").value = "";

    showTab("download"); // zurück zur Hauptansicht
  });

  // Spiel starten
  playBtn.addEventListener("click", async () => {
    const selectedRealm = document.getElementById("realmSelect").value;
    if (!selectedRealm) return alert("Please select a realm!");

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
  });

  tauriEvent.listen("game_stopped", () => {
    gameRunning = false;
    playBtn.textContent = "Start Game";
    status.textContent = "Game closed";
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

      status.textContent = "Download successful!";
      playBtn.classList.remove('hidden');
      buttonText.textContent = "Download again";

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

  // Dateien prüfen bei Start
  invoke("check_required_files")
    .then((filesOkay) => {
      const playBtn = document.getElementById('playBtn');
      const downloadBtn = document.getElementById('downloadBtn');
      const progressInfo = document.getElementById('progressInfo');

      if (filesOkay) {
        playBtn.classList.remove('hidden');
        downloadBtn.classList.add('hidden');
        progressInfo.classList.add('hidden');
        status.textContent = "Game is ready!";
      } else {
        playBtn.classList.add('hidden');
        downloadBtn.classList.remove('hidden');
        progressInfo.classList.remove('hidden');
        status.textContent = "Ready to Download";
      }
    })
    .catch((err) => {
      console.error("Fehler beim Überprüfen der Spieldateien:", err);
    });

  // Prozesse beenden bei Start
  invoke("stop_game").catch(console.error);
});
