use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

struct OllamaOwned(bool);

fn spawn_sidecars(app: &tauri::App) {
    let handle = app.handle().clone();
    let owned_state = app.state::<Arc<Mutex<OllamaOwned>>>();
    let owned = Arc::clone(&owned_state);

    // Spawn backend sidecar
    match handle.shell().sidecar("signalforge-backend") {
        Ok(cmd) => { let _ = cmd.spawn(); }
        Err(e) => log::error!("Failed to spawn backend: {e}"),
    }

    // Check Ollama then spawn ours if needed (background)
    tauri::async_runtime::spawn(async move {
        // Give backend a moment to start binding its port
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;

        // Probe Ollama
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(2))
            .build()
            .unwrap_or_default();

        let ollama_up = client
            .get("http://localhost:11434/api/tags")
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false);

        if ollama_up {
            log::info!("Adopting externally running Ollama");
            *owned.lock().unwrap() = OllamaOwned(false);
        } else {
            log::info!("Spawning bundled Ollama");
            *owned.lock().unwrap() = OllamaOwned(true);
            match handle.shell().sidecar("ollama") {
                Ok(cmd) => { let _ = cmd.args(["serve"]).spawn(); }
                Err(e) => log::error!("Failed to spawn Ollama: {e}"),
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ollama_owned: Arc<Mutex<OllamaOwned>> = Arc::new(Mutex::new(OllamaOwned(false)));
    let ollama_owned_exit = Arc::clone(&ollama_owned);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .manage(ollama_owned)
        .setup(|app| {
            spawn_sidecars(app);
            Ok(())
        })
        .on_window_event(move |_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if ollama_owned_exit.lock().unwrap().0 {
                    let _ = std::process::Command::new("pkill")
                        .args(["-f", "ollama serve"])
                        .output();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running SignalForge");
}
