use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn setup_hotkey(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Create shortcut for Alt+Space
    let alt_space = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    
    let handle = app.handle().clone();
    
    // Register the hotkey handler
    app.global_shortcut().on_shortcut(alt_space, move |_app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            if let Some(window) = handle.get_webview_window("main") {
                let is_visible = window.is_visible().unwrap_or(false);
                if is_visible {
                    let _ = window.hide();
                    println!("Palette hidden via Alt+Space");
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                    println!("Palette shown and focused via Alt+Space");
                }
            }
        }
    })?;
    
    println!("Global hotkey Alt+Space registered successfully.");
    Ok(())
}
