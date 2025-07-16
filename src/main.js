document.addEventListener('DOMContentLoaded', () => {
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

    downloadBtn.addEventListener('click', async () => {
        try {
            // Button-Status aktualisieren
            downloadBtn.disabled = true;
            buttonText.textContent = "Getting patched...";
            downloadIcon.classList.add('hidden');
            spinner.classList.remove('hidden');
            status.textContent = "Getting patched...";

            // Event Listener für Fortschrittsupdates
            unlisten = await window.__TAURI__.event.listen(
                'download_progress',
                ({ payload }) => {
                    progressPercent.textContent = `${payload.percent.toFixed(1)}%`;
                    progressBar.style.width = `${payload.percent}%`;
                    speed.textContent = `${payload.speed} KB/s`;
                    downloaded.textContent = `${payload.downloaded} MB of ${payload.total} MB`;
                    status.textContent = "Downloading...";
                }
            );

            // Download starten
            await window.__TAURI__.tauri.invoke('start_download');

            // Erfolgsmeldung und Button anzeigen
            status.textContent = "Download was sucessfull!";
            await window.__TAURI__.event.listen('extract_success', () => {
                status.textContent = "Things getting together!";
            });
            
            await window.__TAURI__.event.listen('extract_error', ({ payload }) => {
                status.textContent = `Error: ${payload.error}`;
            });
            buttonText.textContent = "Download again";
            playBtn.classList.remove('hidden');
            
        } catch (error) {
            status.textContent = `Error: ${error.message}`;
            console.error("Download failed:", error);
        } finally {
            if (unlisten) {
                await unlisten();
            }
            downloadBtn.disabled = false;
            downloadIcon.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Spiel starten Button Funktion
    playBtn.addEventListener('click', () => {
        if (!gameRunning) {
            status.textContent = "Game started...";
            window.__TAURI__.invoke("start_game")
                .then(() => console.log("Game started!"))
                .catch(console.error);
        } else {
            status.textContent = "Game closed...";
            window.__TAURI__.invoke("stop_game")
                .then(() => console.log("Game closed!"))
                .catch(console.error);
        }
    });

    window.__TAURI__.event.listen("game_started", () => {
        gameRunning = true;
        playBtn.textContent = "Close Game";
        status.textContent = "Game running";
    });
    
    window.__TAURI__.event.listen("game_stopped", () => {
        gameRunning = false;
        playBtn.textContent = "Start Game";
        status.textContent = "Game getting closed";
    });

    window.addEventListener('extract_done', (event) => {
        const { archive, ziel } = event.detail;
        console.log(`Entpacken abgeschlossen: ${archive} -> ${ziel}`);
        // Hier kannst du UI-Aktualisierungen durchführen, z. B. eine Erfolgsmeldung anzeigen.
    });
    
    window.addEventListener('extract_failed', (event) => {
        const { archive, error } = event.detail;
        console.error(`Fehler beim Entpacken von ${archive}: ${error}`);
        // Hier kannst du UI-Aktualisierungen durchführen, z. B. eine Fehlermeldung anzeigen.
    });

    window.__TAURI__.invoke("stop_game")
        .then(() => console.log("Spielprozesse beendet."))
        .catch(console.error);

    window.__TAURI__.tauri.invoke('check_required_files')
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
        }
    })
    .catch((err) => {
        console.error("Fehler beim Überprüfen der Spieldateien:", err);
    });
});
