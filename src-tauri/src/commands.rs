use tauri::State;
use crate::DbState;

#[tauri::command]
pub fn save_capture(text: String, state: State<'_, DbState>) -> Result<(), String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err("Cannot save empty capture".to_string());
    }

    // Lock connection Mutex and execute insert query
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO captures (text) VALUES (?1)",
        [trimmed],
    )
    .map_err(|e| e.to_string())?;

    println!("Saved capture: {}", trimmed);
    Ok(())
}

#[tauri::command]
pub fn hide_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

fn format_fts_query(query: &str) -> String {
    let mut formatted = String::new();
    for word in query.split_whitespace() {
        if !formatted.is_empty() {
            formatted.push_str(" ");
        }
        // Escape single quotes and append asterisk for prefix matching
        let escaped = word.replace('\'', "''");
        formatted.push_str(&format!("{}*", escaped));
    }
    formatted
}

#[tauri::command]
pub fn search_captures(query: String, state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let fts_query = format_fts_query(trimmed);
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT text FROM captures_fts WHERE captures_fts MATCH ? ORDER BY rank LIMIT 4")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([fts_query], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        if let Ok(text) = row {
            results.push(text);
        }
    }

    Ok(results)
}
