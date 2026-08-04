use std::fs;
use std::path::PathBuf;

use serde_json::Value;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_window_state::{StateFlags, WindowExt};

fn get_backup_file(app: &tauri::AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().unwrap_or_default();
    std::fs::create_dir_all(&path).ok();
    path.push("floating-notes-data.json.bak");
    path
}

#[tauri::command]
fn save_data(app: tauri::AppHandle, data: Value) -> Result<(), String> {
    let path = get_data_file(&app);
    let backup_path = get_backup_file(&app);
    let tmp_path = path.with_extension("json.tmp");

    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;

    // 1. Escreve primeiro em um arquivo temporário (.tmp)
    fs::write(&tmp_path, &json).map_err(|e| e.to_string())?;

    // 2. Se o arquivo principal existe, atualiza o backup (.bak) antes de substituir
    if path.exists() {
        let _ = fs::copy(&path, &backup_path);
    }

    // 3. Renomeia atomicamente o arquivo temporário para o arquivo principal
    fs::rename(&tmp_path, &path).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_data(app: tauri::AppHandle) -> Result<Value, String> {
    let path = get_data_file(&app);
    let backup_path = get_backup_file(&app);

    // Tenta ler o arquivo principal
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if !content.trim().is_empty() {
                if let Ok(value) = serde_json::from_str::<Value>(&content) {
                    if !value.is_null() {
                        return Ok(value);
                    }
                }
            }
        }
    }

    // Se o arquivo principal falhou ou está corrompido/vazio, tenta restaurar do backup (.bak)
    if backup_path.exists() {
        if let Ok(content) = fs::read_to_string(&backup_path) {
            if !content.trim().is_empty() {
                if let Ok(value) = serde_json::from_str::<Value>(&content) {
                    if !value.is_null() {
                        // Restaura o arquivo principal com os dados do backup
                        let _ = fs::copy(&backup_path, &path);
                        return Ok(value);
                    }
                }
            }
        }
    }

    Ok(serde_json::json!(null))
}

#[tauri::command]
fn get_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
fn set_window_title(app: tauri::AppHandle, title: String) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_title(&title);
    }
}

#[tauri::command]
fn save_txt(filename: String, content: String) -> Result<Option<String>, String> {
    let res = rfd::FileDialog::new()
        .add_filter("Texto", &["txt"])
        .set_file_name(&filename)
        .save_file();

    if let Some(path) = res {
        fs::write(&path, content).map_err(|e| e.to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn save_pdf(filename: String, data: Vec<u8>) -> Result<Option<String>, String> {
    let res = rfd::FileDialog::new()
        .add_filter("PDF", &["pdf"])
        .set_file_name(&filename)
        .save_file();

    if let Some(path) = res {
        fs::write(&path, data).map_err(|e| e.to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn open_file(file_path: String) -> Result<(), String> {
    open::that(&file_path).map_err(|e| e.to_string())
}

fn get_data_file(app: &tauri::AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().unwrap_or_default();

    std::fs::create_dir_all(&path).ok();

    path.push("floating-notes-data.json");

    path
}

#[tauri::command]
fn save_md(filename: String, content: String) -> Result<Option<String>, String> {
    let res = rfd::FileDialog::new()
        .add_filter("Markdown", &["md"])
        .set_file_name(&filename)
        .save_file();

    if let Some(path) = res {
        fs::write(&path, content).map_err(|e| e.to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn toggle_always_on_top(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("main") {
        let current = window.is_always_on_top().unwrap_or(false);
        let next = !current;
        window.set_always_on_top(next).map_err(|e| e.to_string())?;
        Ok(next)
    } else {
        Err("Janela principal não encontrada".into())
    }
}

#[tauri::command]
fn is_always_on_top(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("main") {
        Ok(window.is_always_on_top().unwrap_or(false))
    } else {
        Ok(false)
    }
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_updater::UpdaterExt;

    let handle = app.clone();
    let updater = match handle.updater() {
        Ok(u) => u,
        Err(e) => return Err(e.to_string()),
    };

    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version.clone();
            let _ = handle.emit("update-available", &version);

            let handle_clone = handle.clone();
            let mut downloaded: u64 = 0;

            let download_res = update
                .download_and_install(
                    move |chunk_length, content_length| {
                        downloaded += chunk_length as u64;
                        let percent = if let Some(total) = content_length {
                            if total > 0 {
                                ((downloaded as f64 / total as f64) * 100.0) as u32
                            } else {
                                0
                            }
                        } else {
                            0
                        };
                        let _ = handle_clone.emit("update-progress", percent);
                    },
                    || {},
                )
                .await;

            match download_res {
                Ok(_) => {
                    let _ = handle.emit("update-downloaded", ());
                    Ok(true)
                }
                Err(e) => {
                    let _ = handle.emit("update-error", e.to_string());
                    Err(e.to_string())
                }
            }
        }
        Ok(None) => Ok(false),
        Err(e) => {
            let _ = handle.emit("update-error", e.to_string());
            Err(e.to_string())
        }
    }
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

#[tauri::command]
fn minimize_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.minimize();
    }
}

#[tauri::command]
fn maximize_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_maximized().unwrap_or(false) {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
fn close_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    }
}

#[tauri::command]
fn start_drag(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.start_dragging();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(
            tauri_plugin_single_instance::init(|app, _args, _cwd| {
                // Se o usuário tentar abrir uma segunda instância,
                // apenas traz a janela existente para o foco
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            })
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Restaurar posição/tamanho da janela ANTES de exibi-la, eliminando o "flash"
            // O plugin restaura posição; set_decorations(false) garante que o estado antigo
            // com a barra nativa não seja restaurado pelo tauri_plugin_window_state
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.restore_state(StateFlags::all());
                let _ = window.set_decorations(false);
                let _ = window.set_always_on_top(false);
                let _ = window.show();
                let _ = window.set_focus();
            }

            // Registrar atalhos globais
            let ctrl_alt_n = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyN);
            let ctrl_alt_t = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyT);
            let ctrl_alt_p = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyP);

            let app_handle = app.handle().clone();
            let _ = app
                .global_shortcut()
                .on_shortcut(ctrl_alt_n, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                });

            let app_handle = app.handle().clone();
            let _ = app
                .global_shortcut()
                .on_shortcut(ctrl_alt_t, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.emit("shortcut-new-tab", ());
                        }
                    }
                });

            let app_handle = app.handle().clone();
            let _ = app
                .global_shortcut()
                .on_shortcut(ctrl_alt_p, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            if let Ok(is_on_top) = window.is_always_on_top() {
                                let next = !is_on_top;
                                let _ = window.set_always_on_top(next);
                                let _ = window.emit("always-on-top-changed", next);
                            }
                        }
                    }
                });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_data,
            load_data,
            get_version,
            set_window_title,
            save_txt,
            save_pdf,
            save_md,
            open_file,
            toggle_always_on_top,
            is_always_on_top,
            check_for_updates,
            restart_app,
            minimize_window,
            maximize_window,
            close_window,
            start_drag
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
