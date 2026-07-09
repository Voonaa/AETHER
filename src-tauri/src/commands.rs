use tauri::State;
use crate::DbState;

#[tauri::command]
pub fn save_capture(text: String, state: State<'_, DbState>) -> Result<(), String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err("Cannot save empty capture".to_string());
    }

    // Parse slash command prefixes
    let (content, cap_type) = if trimmed.to_lowercase().starts_with("/task ") {
        (&trimmed[6..], "task")
    } else if trimmed.to_lowercase().starts_with("/note ") {
        (&trimmed[6..], "note")
    } else {
        (trimmed, "note")
    };

    let content_trimmed = content.trim();
    if content_trimmed.is_empty() {
        return Err("Cannot save empty capture content".to_string());
    }

    // Lock connection Mutex and execute insert query with type classification
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO captures (text, type) VALUES (?1, ?2)",
        [content_trimmed, cap_type],
    )
    .map_err(|e| e.to_string())?;

    println!("Saved capture: [{}] {}", cap_type, content_trimmed);
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

#[derive(serde::Serialize)]
pub struct SearchResult {
    pub id: i64,
    pub text: String,
    pub cap_type: String,
    pub completed: bool,
}

#[tauri::command]
pub fn search_captures(query: String, state: State<'_, DbState>) -> Result<Vec<SearchResult>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let (is_todo_filter, search_term) = if trimmed.to_lowercase() == "/todo" {
        (true, "")
    } else if trimmed.to_lowercase().starts_with("/todo ") {
        (true, trimmed[6..].trim())
    } else {
        (false, trimmed)
    };

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut results = Vec::new();

    if is_todo_filter {
        if search_term.is_empty() {
            // Get 4 most recent uncompleted tasks
            let mut stmt = conn
                .prepare("SELECT id, text, type, completed FROM captures WHERE type = 'task' AND completed = 0 ORDER BY id DESC LIMIT 4")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |row| {
                    Ok(SearchResult {
                        id: row.get(0)?,
                        text: row.get(1)?,
                        cap_type: row.get(2)?,
                        completed: row.get::<_, i32>(3)? != 0,
                    })
                })
                .map_err(|e| e.to_string())?;
            for row in rows {
                if let Ok(item) = row {
                    results.push(item);
                }
            }
        } else {
            // Search active tasks with text match
            let fts_query = format_fts_query(search_term);
            let mut stmt = conn
                .prepare("SELECT c.id, c.text, c.type, c.completed FROM captures c JOIN captures_fts f ON c.id = f.rowid WHERE f.captures_fts MATCH ?1 AND c.type = 'task' AND c.completed = 0 LIMIT 4")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([fts_query], |row| {
                    Ok(SearchResult {
                        id: row.get(0)?,
                        text: row.get(1)?,
                        cap_type: row.get(2)?,
                        completed: row.get::<_, i32>(3)? != 0,
                    })
                })
                .map_err(|e| e.to_string())?;
            for row in rows {
                if let Ok(item) = row {
                    results.push(item);
                }
            }
        }
    } else {
        // Plain FTS5 search
        let fts_query = format_fts_query(search_term);
        let mut stmt = conn
            .prepare("SELECT c.id, c.text, c.type, c.completed FROM captures c JOIN captures_fts f ON c.id = f.rowid WHERE f.captures_fts MATCH ?1 ORDER BY rank LIMIT 4")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([fts_query], |row| {
                Ok(SearchResult {
                    id: row.get(0)?,
                    text: row.get(1)?,
                    cap_type: row.get(2)?,
                    completed: row.get::<_, i32>(3)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;
        for row in rows {
            if let Ok(item) = row {
                results.push(item);
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn toggle_task_completion(id: i64, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE captures SET completed = 1 - completed WHERE id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;

    println!("Toggled task completion for ID: {}", id);
    Ok(())
}
