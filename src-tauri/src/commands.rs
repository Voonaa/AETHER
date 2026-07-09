use tauri::{State, Manager};
use crate::DbState;

#[tauri::command]
pub fn save_capture(text: String, state: State<'_, DbState>) -> Result<String, String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err("Cannot save empty capture".to_string());
    }

    // Intercept /focus command
    if trimmed.to_lowercase() == "/focus" {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let current_val: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'focus_mode'",
                [],
                |row| row.get(0),
            )
            .unwrap_or_else(|_| "false".to_string());

        let next_val = if current_val == "true" { "false" } else { "true" };

        conn.execute(
            "UPDATE settings SET value = ?1 WHERE key = 'focus_mode'",
            [next_val],
        )
        .map_err(|e| e.to_string())?;

        println!("Command parsed: /focus. Toggled Focus Mode to: {}", next_val);
        return Ok(if next_val == "true" { "focus_enabled".to_string() } else { "focus_disabled".to_string() });
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
    Ok("saved".to_string())
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

#[derive(serde::Serialize)]
pub struct WidgetData {
    pub date: String,
    pub tasks: Vec<SearchResult>,
    pub last_note: Option<String>,
    pub focus_mode: bool,
}

fn get_local_date_string(conn: &rusqlite::Connection) -> String {
    let raw_date: Result<String, _> = conn.query_row(
        "SELECT strftime('%w %m %d', 'now', 'localtime')",
        [],
        |row| row.get(0),
    );

    if let Ok(raw) = raw_date {
        let parts: Vec<&str> = raw.split_whitespace().collect();
        if parts.len() == 3 {
            let w_idx: usize = parts[0].parse().unwrap_or(0);
            let m_idx: usize = parts[1].parse().unwrap_or(1);
            let day = parts[2];

            let weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            let months = [
                "", "January", "February", "March", "April", "May", "June", 
                "July", "August", "September", "October", "November", "December"
            ];

            let weekday = weekdays.get(w_idx).unwrap_or(&"Sunday");
            let month = months.get(m_idx).unwrap_or(&"January");

            // Strip leading zero from day if any
            let day_clean = day.trim_start_matches('0');
            let day_str = if day_clean.is_empty() { "0" } else { day_clean };

            return format!("{}, {} {}", weekday, month, day_str);
        }
    }
    "Today Surfaced".to_string()
}

#[tauri::command]
pub fn get_widget_data(state: State<'_, DbState>) -> Result<WidgetData, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // 1. Get formatted local date string
    let date_str = get_local_date_string(&conn);

    // 2. Query top 3 uncompleted tasks
    let mut stmt = conn
        .prepare("SELECT id, text, type, completed FROM captures WHERE type = 'task' AND completed = 0 ORDER BY id DESC LIMIT 3")
        .map_err(|e| e.to_string())?;
    let task_rows = stmt
        .query_map([], |row| {
            Ok(SearchResult {
                id: row.get(0)?,
                text: row.get(1)?,
                cap_type: row.get(2)?,
                completed: row.get::<_, i32>(3)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();
    for row in task_rows {
        if let Ok(task) = row {
            tasks.push(task);
        }
    }

    // 3. Query latest note
    let last_note: Option<String> = conn
        .query_row(
            "SELECT text FROM captures WHERE type = 'note' ORDER BY id DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    // 4. Query focus mode setting
    let focus_mode_str: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'focus_mode'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "false".to_string());
    let focus_mode = focus_mode_str == "true";

    Ok(WidgetData {
        date: date_str,
        tasks,
        last_note,
        focus_mode,
    })
}

#[tauri::command]
pub fn toggle_focus_mode(state: State<'_, DbState>) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Read current focus mode value
    let current_val: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'focus_mode'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "false".to_string());

    let next_val = if current_val == "true" { "false" } else { "true" };

    // Write new value to settings table
    conn.execute(
        "UPDATE settings SET value = ?1 WHERE key = 'focus_mode'",
        [next_val],
    )
    .map_err(|e| e.to_string())?;

    println!("Toggled Focus Mode in database to: {}", next_val);
    Ok(next_val == "true")
}

#[tauri::command]
pub fn show_palette(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(main_win) = app.get_webview_window("main") {
        main_win.show().map_err(|e| e.to_string())?;
        main_win.set_focus().map_err(|e| e.to_string())?;
        println!("Launcher main window shown and focused from widget click");
    }
    Ok(())
}
