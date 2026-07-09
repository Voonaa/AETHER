// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod db;
mod commands;
mod hotkey;

// thread-safe wrapper for SQLite Connection
pub struct DbState(pub std::sync::Mutex<rusqlite::Connection>);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Get AppData directory for local SQLite storage
            let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            println!("SQLite database directory: {:?}", app_data_dir);

            // Initialize database
            let conn = db::init_db(&app_data_dir)
                .map_err(|e| e.to_string())?;
            app.manage(DbState(std::sync::Mutex::new(conn)));

            // Setup global hotkeys
            hotkey::setup_hotkey(app)?;

            // Setup focus loss (blur) behavior to hide the window
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = window_clone.hide();
                        println!("Palette hidden due to focus loss (blur)");
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::save_capture,
            commands::hide_window,
            commands::search_captures,
            commands::toggle_task_completion,
            commands::get_widget_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
