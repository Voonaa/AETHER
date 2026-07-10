use rusqlite::Connection;
use std::path::Path;

pub fn init_db(app_data_dir: &Path) -> Result<Connection, String> {
    std::fs::create_dir_all(app_data_dir).map_err(|e| e.to_string())?;
    
    let db_path = app_data_dir.join("captures.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    
    // ── captures table ────────────────────────────────────────
    conn.execute(
        "CREATE TABLE IF NOT EXISTS captures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Safe migration: add 'type' column if missing
    let has_type = column_exists(&conn, "captures", "type")?;
    if !has_type {
        conn.execute(
            "ALTER TABLE captures ADD COLUMN type TEXT NOT NULL DEFAULT 'note'", []
        ).map_err(|e| e.to_string())?;
        println!("Migration: Added 'type' column.");
    }

    // Safe migration: add 'completed' column if missing
    let has_completed = column_exists(&conn, "captures", "completed")?;
    if !has_completed {
        conn.execute(
            "ALTER TABLE captures ADD COLUMN completed INTEGER NOT NULL DEFAULT 0", []
        ).map_err(|e| e.to_string())?;
        println!("Migration: Added 'completed' column.");
    }

    // ── FTS5 full-text search ────────────────────────────────
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS captures_fts USING fts5(
            text, content='captures', content_rowid='id'
        )", [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS captures_ai AFTER INSERT ON captures BEGIN
            INSERT INTO captures_fts(rowid, text) VALUES (new.id, new.text);
        END;", [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO captures_fts(rowid, text)
         SELECT id, text FROM captures
         WHERE id NOT IN (SELECT rowid FROM captures_fts)", [],
    ).map_err(|e| e.to_string())?;

    // ── settings table ────────────────────────────────────────
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )", [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('focus_mode', 'false')", [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('user_xp', '0')", [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('user_level', '1')", [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('user_theme', 'navy')", [],
    ).map_err(|e| e.to_string())?;

    // ── habits table ──────────────────────────────────────────
    conn.execute(
        "CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            streak INTEGER NOT NULL DEFAULT 0,
            last_completed TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )", [],
    ).map_err(|e| e.to_string())?;

    // ── motivations table ─────────────────────────────────────
    conn.execute(
        "CREATE TABLE IF NOT EXISTS motivations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT 'Anonim',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )", [],
    ).map_err(|e| e.to_string())?;

    // Seed default motivations if table is empty
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM motivations", [], |r| r.get(0)
    ).unwrap_or(0);

    if count == 0 {
        let defaults = vec![
            ("Dengan Tuhan, tidak ada yang mustahil.", "Lukas 1:37"),
            ("Jangan hitung hari-harimu, jadikan setiap harimu berarti.", "Muhammad Ali"),
            ("Mimpi besar. Mulai kecil. Bertindak sekarang.", "Robin Sharma"),
            ("Kamu tidak harus hebat untuk memulai, tapi kamu harus memulai untuk menjadi hebat.", "Zig Ziglar"),
            ("Disiplin adalah jembatan antara tujuan dan pencapaian.", "Jim Rohn"),
            ("Hidup adalah 10% apa yang terjadi padamu dan 90% bagaimana kamu meresponsnya.", "Charles R. Swindoll"),
            ("Jangan takut gagal. Takutlah tidak mencoba.", "Roy T. Bennett"),
            ("Hari ini sulit, esok lebih sulit, tapi lusa indah.", "Jack Ma"),
            ("Satu langkah kecil setiap hari menghasilkan hasil yang luar biasa.", "Anonim"),
            ("Percayalah pada prosesnya. Hasilnya akan mengejutkanmu.", "Anonim"),
        ];
        for (text, author) in defaults {
            conn.execute(
                "INSERT INTO motivations (text, author) VALUES (?1, ?2)",
                [text, author],
            ).map_err(|e| e.to_string())?;
        }
        println!("Seeded {} default motivations.", 10);
    }

    Ok(conn)
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let col_name: String = row.get(1).map_err(|e| e.to_string())?;
        if col_name == column {
            return Ok(true);
        }
    }
    Ok(false)
}
