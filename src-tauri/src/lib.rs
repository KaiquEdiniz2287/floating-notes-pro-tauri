use std::fs;
use std::path::PathBuf;

use serde_json::Value;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[tauri::command]
fn save_data(app: tauri::AppHandle, data: Value) -> Result<(), String> {
    let path = get_data_file(&app);

    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;

    fs::write(path, json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_data(app: tauri::AppHandle) -> Result<Value, String> {
    let path = get_data_file(&app);

    if !path.exists() {
        return Ok(serde_json::json!(null));
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;

    let value = serde_json::from_str::<Value>(&content).map_err(|e| e.to_string())?;

    Ok(value)
}

#[tauri::command]
fn get_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Garante que a janela abre com always_on_top = false (desativado por padrão)
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(false);
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
            save_txt,
            save_pdf,
            save_md,
            open_file,
            toggle_always_on_top,
            is_always_on_top
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
