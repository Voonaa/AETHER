use rusqlite::Connection;
use std::path::Path;

pub fn init_db(app_data_dir: &Path) -> Result<Connection, String> {
    // Ensure the app data directory exists
    std::fs::create_dir_all(app_data_dir).map_err(|e| e.to_string())?;
    
    let db_path = app_data_dir.join("captures.db");
    
    // Open the SQLite database (or create it if it doesn't exist)
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    
    // Create the captures table if it doesn't already exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS captures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Check if 'type' column exists in 'captures' table
    let mut has_type_column = false;
    {
        let mut stmt = conn.prepare("PRAGMA table_info(captures)").map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let col_name: String = row.get(1).map_err(|e| e.to_string())?;
            if col_name == "type" {
                has_type_column = true;
                break;
            }
        }
    }

    // Add 'type' column if missing (safe schema migration)
    if !has_type_column {
        conn.execute(
            "ALTER TABLE captures ADD COLUMN type TEXT NOT NULL DEFAULT 'note'",
            [],
        )
        .map_err(|e| e.to_string())?;
        println!("Database migration: Added 'type' column to 'captures' table.");
    }
    
    // Create the FTS5 virtual table for full-text search index
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS captures_fts USING fts5(
            text,
            content='captures',
            content_rowid='id'
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Create a trigger to automatically sync inserts from captures to captures_fts
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS captures_ai AFTER INSERT ON captures BEGIN
            INSERT INTO captures_fts(rowid, text) VALUES (new.id, new.text);
        END;",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Populate FTS5 table with any pre-existing captures that aren't indexed yet
    conn.execute(
        "INSERT INTO captures_fts(rowid, text)
         SELECT id, text FROM captures
         WHERE id NOT IN (SELECT rowid FROM captures_fts)",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(conn)
}
