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
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if trimmed.is_empty() {
        let mut stmt = conn.prepare("SELECT id, text, type, completed FROM captures ORDER BY id DESC LIMIT 50").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok(SearchResult {
                id: row.get(0)?,
                text: row.get(1)?,
                cap_type: row.get(2)?,
                completed: row.get::<_, i32>(3)? != 0,
            })
        }).map_err(|e| e.to_string())?;
        let mut results = Vec::new();
        for row in rows {
            if let Ok(item) = row {
                results.push(item);
            }
        }
        return Ok(results);
    }

    let (is_todo_filter, search_term) = if trimmed.to_lowercase() == "/todo" {
        (true, "")
    } else if trimmed.to_lowercase().starts_with("/todo ") {
        (true, trimmed[6..].trim())
    } else {
        (false, trimmed)
    };

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

#[derive(serde::Serialize, Clone, Debug)]
pub struct UserStats {
    pub xp: i64,
    pub level: i64,
}

pub fn add_xp_internal(amount: i64, state: State<'_, DbState>) -> Result<UserStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let xp_str: String = conn.query_row("SELECT value FROM settings WHERE key = 'user_xp'", [], |r| r.get(0))
        .unwrap_or_else(|_| "0".to_string());
    let lvl_str: String = conn.query_row("SELECT value FROM settings WHERE key = 'user_level'", [], |r| r.get(0))
        .unwrap_or_else(|_| "1".to_string());

    let mut xp: i64 = xp_str.parse().unwrap_or(0);
    let mut level: i64 = lvl_str.parse().unwrap_or(1);

    xp += amount;
    if xp < 0 {
        xp = 0;
    }

    // Level up logic: Level L requires L * 100 XP
    loop {
        let req = level * 100;
        if xp >= req {
            xp -= req;
            level += 1;
        } else {
            break;
        }
    }

    conn.execute("UPDATE settings SET value = ?1 WHERE key = 'user_xp'", [xp.to_string()]).map_err(|e| e.to_string())?;
    conn.execute("UPDATE settings SET value = ?1 WHERE key = 'user_level'", [level.to_string()]).map_err(|e| e.to_string())?;

    Ok(UserStats { xp, level })
}

#[tauri::command]
pub fn toggle_task_completion(id: i64, state: State<'_, DbState>) -> Result<UserStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE captures SET completed = 1 - completed WHERE id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;

    let completed: i32 = conn.query_row(
        "SELECT completed FROM captures WHERE id = ?1",
        [id],
        |r| r.get(0)
    ).map_err(|e| e.to_string())?;

    let xp_change = if completed != 0 { 10 } else { -10 };
    drop(conn);

    add_xp_internal(xp_change, state)
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

// ── Set widget always-on-top (pin) via Rust ────────────────────
#[tauri::command]
pub fn set_widget_pin(pinned: bool, app: tauri::AppHandle) -> Result<(), String> {
    if let Some(widget) = app.get_webview_window("widget") {
        widget.set_always_on_top(pinned).map_err(|e| e.to_string())?;
        println!("Widget pin set to: {}", pinned);
    }
    Ok(())
}

// ── Direct widget capture (no palette needed) ─────────────────
#[tauri::command]
pub fn save_widget_capture(text: String, cap_type: String, state: State<'_, DbState>) -> Result<(), String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err("Cannot save empty capture".to_string());
    }
    let ct = if cap_type == "task" { "task" } else { "note" };
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO captures (text, type) VALUES (?1, ?2)",
        [trimmed, ct],
    ).map_err(|e| e.to_string())?;
    println!("Widget capture saved: [{}] {}", ct, trimmed);
    Ok(())
}

// ── Delete capture ─────────────────────────────────────────────
#[tauri::command]
pub fn delete_capture(id: i64, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM captures WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Motivations CRUD ───────────────────────────────────────────
#[derive(serde::Serialize, Clone)]
pub struct Motivation {
    pub id: i64,
    pub text: String,
    pub author: String,
}

#[tauri::command]
pub fn get_motivations(state: State<'_, DbState>) -> Result<Vec<Motivation>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, text, author FROM motivations ORDER BY id ASC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Motivation {
            id: row.get(0)?,
            text: row.get(1)?,
            author: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut motivations = Vec::new();
    for row in rows {
        if let Ok(m) = row { motivations.push(m); }
    }
    Ok(motivations)
}

#[tauri::command]
pub fn add_motivation(text: String, author: String, state: State<'_, DbState>) -> Result<i64, String> {
    let trimmed = text.trim().to_string();
    let author_trimmed = if author.trim().is_empty() { "Anonim".to_string() } else { author.trim().to_string() };
    if trimmed.is_empty() {
        return Err("Motivation text cannot be empty".to_string());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO motivations (text, author) VALUES (?1, ?2)",
        [&trimmed, &author_trimmed],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    println!("Added motivation id={}: {} — {}", id, trimmed, author_trimmed);
    Ok(id)
}

#[tauri::command]
pub fn update_motivation(id: i64, text: String, author: String, state: State<'_, DbState>) -> Result<(), String> {
    let trimmed = text.trim().to_string();
    let author_trimmed = if author.trim().is_empty() { "Anonim".to_string() } else { author.trim().to_string() };
    if trimmed.is_empty() {
        return Err("Motivation text cannot be empty".to_string());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE motivations SET text = ?1, author = ?2 WHERE id = ?3",
        rusqlite::params![trimmed, author_trimmed, id],
    ).map_err(|e| e.to_string())?;
    println!("Updated motivation id={}", id);
    Ok(())
}

#[tauri::command]
pub fn delete_motivation(id: i64, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM motivations WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    println!("Deleted motivation id={}", id);
    Ok(())
}

// ── Habits and Gamification commands ──────────────────────────

#[derive(serde::Serialize)]
pub struct Habit {
    pub id: i64,
    pub text: String,
    pub streak: i64,
    pub last_completed: Option<String>,
}

#[tauri::command]
pub fn get_habits(state: State<'_, DbState>) -> Result<Vec<Habit>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, text, streak, last_completed FROM habits ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Habit {
            id: row.get(0)?,
            text: row.get(1)?,
            streak: row.get(2)?,
            last_completed: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut habits = Vec::new();
    for r in rows {
        if let Ok(h) = r { habits.push(h); }
    }
    Ok(habits)
}

#[tauri::command]
pub fn add_habit(text: String, state: State<'_, DbState>) -> Result<i64, String> {
    let trimmed = text.trim().to_string();
    if trimmed.is_empty() { return Err("Habit text cannot be empty".to_string()); }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO habits (text, streak, last_completed) VALUES (?1, 0, NULL)", [&trimmed])
        .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn delete_habit(id: i64, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM habits WHERE id = ?1", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_habit_completion(id: i64, state: State<'_, DbState>) -> Result<UserStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let today: String = conn.query_row("SELECT date('now', 'localtime')", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let yesterday: String = conn.query_row("SELECT date('now', '-1 day', 'localtime')", [], |r| r.get(0)).map_err(|e| e.to_string())?;

    let (streak, last_completed): (i64, Option<String>) = conn.query_row(
        "SELECT streak, last_completed FROM habits WHERE id = ?1",
        [id],
        |r| Ok((r.get(0)?, r.get(1)?))
    ).map_err(|e| e.to_string())?;

    let mut new_streak = streak;
    let mut new_last_completed = None;
    let mut xp_change = 0;

    if let Some(ref date_str) = last_completed {
        if date_str == &today {
            new_last_completed = None;
            if new_streak > 0 {
                new_streak -= 1;
            }
            xp_change = -15;
        } else {
            new_last_completed = Some(today.clone());
            if date_str == &yesterday {
                new_streak += 1;
            } else {
                new_streak = 1;
            }
            xp_change = 15;
        }
    } else {
        new_last_completed = Some(today.clone());
        new_streak = 1;
        xp_change = 15;
    }

    conn.execute(
        "UPDATE habits SET streak = ?1, last_completed = ?2 WHERE id = ?3",
        rusqlite::params![new_streak, new_last_completed, id]
    ).map_err(|e| e.to_string())?;

    drop(conn);
    add_xp_internal(xp_change, state)
}

#[tauri::command]
pub fn get_user_stats(state: State<'_, DbState>) -> Result<UserStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let xp_str: String = conn.query_row("SELECT value FROM settings WHERE key = 'user_xp'", [], |r| r.get(0))
        .unwrap_or_else(|_| "0".to_string());
    let lvl_str: String = conn.query_row("SELECT value FROM settings WHERE key = 'user_level'", [], |r| r.get(0))
        .unwrap_or_else(|_| "1".to_string());
    Ok(UserStats {
        xp: xp_str.parse().unwrap_or(0),
        level: lvl_str.parse().unwrap_or(1),
    })
}

#[tauri::command]
pub fn add_xp(amount: i64, state: State<'_, DbState>) -> Result<UserStats, String> {
    add_xp_internal(amount, state)
}

#[tauri::command]
pub fn get_theme(state: State<'_, DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let theme: String = conn.query_row("SELECT value FROM settings WHERE key = 'user_theme'", [], |r| r.get(0))
        .unwrap_or_else(|_| "navy".to_string());
    Ok(theme)
}

#[tauri::command]
pub fn set_theme(theme: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('user_theme', ?1)", [theme])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Daily Mood Check-in commands ──────────────────────────────

#[derive(serde::Serialize)]
pub struct MoodEntry {
    pub id: i64,
    pub mood: String,
    pub date: String,
}

#[tauri::command]
pub fn record_mood(mood: String, state: State<'_, DbState>) -> Result<UserStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let today: String = conn.query_row("SELECT date('now', 'localtime')", [], |r| r.get(0)).map_err(|e| e.to_string())?;

    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM moods WHERE date = ?1",
        [&today],
        |r| r.get(0)
    ).unwrap_or(0);

    if exists > 0 {
        conn.execute(
            "UPDATE moods SET mood = ?1 WHERE date = ?2",
            [mood, today]
        ).map_err(|e| e.to_string())?;
        drop(conn);
        get_user_stats(state)
    } else {
        conn.execute(
            "INSERT INTO moods (mood, date) VALUES (?1, ?2)",
            [mood, today]
        ).map_err(|e| e.to_string())?;
        drop(conn);
        add_xp_internal(10, state)
    }
}

#[tauri::command]
pub fn get_mood_history(state: State<'_, DbState>) -> Result<Vec<MoodEntry>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, mood, date FROM moods ORDER BY date DESC LIMIT 7")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(MoodEntry {
            id: row.get(0)?,
            mood: row.get(1)?,
            date: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut history = Vec::new();
    for r in rows {
        if let Ok(entry) = r {
            history.push(entry);
        }
    }
    history.reverse();
    Ok(history)
}

// ── BACKUP / RESTORE ─────────────────────────────────────────
use std::fs;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct CaptureBackup { id: i64, text: String, cap_type: String, completed: i32 }
#[derive(serde::Serialize, serde::Deserialize)]
pub struct HabitBackup { id: i64, text: String, streak: i64, last_completed: Option<String> }
#[derive(serde::Serialize, serde::Deserialize)]
pub struct MotivationBackup { id: i64, text: String, author: String }
#[derive(serde::Serialize, serde::Deserialize)]
pub struct MoodBackup { id: i64, mood: String, date: String }
#[derive(serde::Serialize, serde::Deserialize)]
pub struct SettingBackup { key: String, value: String }

#[derive(serde::Serialize, serde::Deserialize)]
pub struct BackupData {
    pub captures: Vec<CaptureBackup>,
    pub habits: Vec<HabitBackup>,
    pub motivations: Vec<MotivationBackup>,
    pub moods: Vec<MoodBackup>,
    pub settings: Vec<SettingBackup>,
}

#[tauri::command]
pub fn export_backup(state: State<'_, DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let captures: Vec<CaptureBackup> = conn.prepare("SELECT id, text, type, completed FROM captures").unwrap()
        .query_map([], |r| Ok(CaptureBackup { id: r.get(0)?, text: r.get(1)?, cap_type: r.get(2)?, completed: r.get(3)? })).unwrap().flatten().collect();
    let habits: Vec<HabitBackup> = conn.prepare("SELECT id, text, streak, last_completed FROM habits").unwrap()
        .query_map([], |r| Ok(HabitBackup { id: r.get(0)?, text: r.get(1)?, streak: r.get(2)?, last_completed: r.get(3)? })).unwrap().flatten().collect();
    let motivations: Vec<MotivationBackup> = conn.prepare("SELECT id, text, author FROM motivations").unwrap()
        .query_map([], |r| Ok(MotivationBackup { id: r.get(0)?, text: r.get(1)?, author: r.get(2)? })).unwrap().flatten().collect();
    let moods: Vec<MoodBackup> = conn.prepare("SELECT id, mood, date FROM moods").unwrap()
        .query_map([], |r| Ok(MoodBackup { id: r.get(0)?, mood: r.get(1)?, date: r.get(2)? })).unwrap().flatten().collect();
    let settings: Vec<SettingBackup> = conn.prepare("SELECT key, value FROM settings").unwrap()
        .query_map([], |r| Ok(SettingBackup { key: r.get(0)?, value: r.get(1)? })).unwrap().flatten().collect();

    let backup = BackupData { captures, habits, motivations, moods, settings };
    let json = serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())?;

    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string());
    let desktop_path = format!("{}\\Desktop\\AetherBackup.json", user_profile);
    fs::write(&desktop_path, json).map_err(|e| e.to_string())?;

    Ok(desktop_path)
}

#[tauri::command]
pub fn import_backup(state: State<'_, DbState>) -> Result<(), String> {
    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string());
    let desktop_path = format!("{}\\Desktop\\AetherBackup.json", user_profile);
    
    let json = fs::read_to_string(&desktop_path).map_err(|e| e.to_string())?;
    let backup: BackupData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute_batch("DELETE FROM captures; DELETE FROM habits; DELETE FROM motivations; DELETE FROM moods; DELETE FROM settings;").map_err(|e| e.to_string())?;
    
    for c in backup.captures {
        tx.execute("INSERT INTO captures (id, text, type, completed) VALUES (?1, ?2, ?3, ?4)", rusqlite::params![c.id, c.text, c.cap_type, c.completed]).ok();
    }
    for h in backup.habits {
        tx.execute("INSERT INTO habits (id, text, streak, last_completed) VALUES (?1, ?2, ?3, ?4)", rusqlite::params![h.id, h.text, h.streak, h.last_completed]).ok();
    }
    for m in backup.motivations {
        tx.execute("INSERT INTO motivations (id, text, author) VALUES (?1, ?2, ?3)", rusqlite::params![m.id, m.text, m.author]).ok();
    }
    for m in backup.moods {
        tx.execute("INSERT INTO moods (id, mood, date) VALUES (?1, ?2, ?3)", rusqlite::params![m.id, m.mood, m.date]).ok();
    }
    for s in backup.settings {
        tx.execute("INSERT INTO settings (key, value) VALUES (?1, ?2)", rusqlite::params![s.key, s.value]).ok();
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

