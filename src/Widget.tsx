import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

// ── Curated motivational quotes (Indonesia + English) ─────────
const QUOTES = [
  { text: "Dengan Tuhan, tidak ada yang mustahil.", author: "Lukas 1:37", accent: "#818cf8" },
  { text: "Kesuksesan adalah jumlah dari usaha-usaha kecil yang diulang hari demi hari.", author: "Robert Collier", accent: "#34d399" },
  { text: "Jangan hitung hari-harimu, jadikan setiap harimu berarti.", author: "Muhammad Ali", accent: "#f59e0b" },
  { text: "Kamu tidak harus hebat untuk memulai, tapi kamu harus memulai untuk menjadi hebat.", author: "Zig Ziglar", accent: "#a78bfa" },
  { text: "Mimpi besar. Mulai kecil. Bertindak sekarang.", author: "Robin Sharma", accent: "#38bdf8" },
  { text: "Hidup adalah 10% apa yang terjadi padamu dan 90% bagaimana kamu meresponsnya.", author: "Charles R. Swindoll", accent: "#4ade80" },
  { text: "Jangan takut gagal. Takutlah tidak mencoba.", author: "Roy T. Bennett", accent: "#e879f9" },
  { text: "Hari ini sulit, esok lebih sulit, tapi lusa indah.", author: "Jack Ma", accent: "#facc15" },
  { text: "Lakukanlah hari ini apa yang orang lain tidak mau lakukan, besok kau hidup seperti yang orang lain tidak bisa.", author: "Jerry Rice", accent: "#fb923c" },
  { text: "Bukan tentang siapa yang tercepat, tapi siapa yang tidak berhenti.", author: "Anonim", accent: "#f472b6" },
  { text: "Every day is a new beginning. Take a deep breath and start again.", author: "Anonim", accent: "#67e8f9" },
  { text: "Disiplin adalah jembatan antara tujuan dan pencapaian.", author: "Jim Rohn", accent: "#86efac" },
  { text: "Satu langkah kecil setiap hari menghasilkan hasil yang besar.", author: "Anonim", accent: "#fca5a5" },
  { text: "Kekuatan tidak berasal dari kemenangan. Perjuanganmulah yang membangun kekuatanmu.", author: "Arnold Schwarzenegger", accent: "#c4b5fd" },
  { text: "Percayalah pada prosesnya. Hasilnya akan mengejutkanmu.", author: "Anonim", accent: "#6ee7b7" },
];

// ── Types ─────────────────────────────────────────────────────
interface Task {
  id: number;
  text: string;
  cap_type: string;
  completed: boolean;
}
interface WidgetData {
  date: string;
  tasks: Task[];
  last_note: string | null;
  focus_mode: boolean;
}

// ── Helper: hex to rgb string ─────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const appWindow = getCurrentWindow();

// ══ MAIN WIDGET ═══════════════════════════════════════════════
export default function Widget() {
  const [data, setData] = useState<WidgetData | null>(null);
  const [allCaptures, setAllCaptures] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"tasks" | "notes" | "motivasi">("tasks");
  const [focusMode, setFocusMode] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // ── Live clock (every second)
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Quote rotation (every 12s)
  useEffect(() => {
    const t = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 500);
    }, 12000);
    return () => clearInterval(t);
  }, []);

  // ── Data fetch
  const fetchData = async () => {
    try {
      const wd = await invoke<WidgetData>("get_widget_data");
      setData(wd);
      setFocusMode(wd.focus_mode);
      const caps = await invoke<Task[]>("search_captures", { query: "" });
      setAllCaptures(caps);
    } catch (e) {
      console.error("Widget data error:", e);
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Handlers
  const handleDrag = async (e: React.MouseEvent) => {
    e.preventDefault();
    try { await appWindow.startDragging(); } catch {}
  };

  const handlePin = async () => {
    const next = !isPinned;
    setIsPinned(next);
    try { await appWindow.setAlwaysOnTop(next); } catch {}
  };

  const handleNextQuote = () => {
    setQuoteVisible(false);
    setTimeout(() => {
      setQuoteIdx(i => (i + 1) % QUOTES.length);
      setQuoteVisible(true);
    }, 300);
  };

  const handleToggleTask = async (id: number) => {
    try {
      await invoke("toggle_task_completion", { id });
      await fetchData();
    } catch {}
  };

  const handleOpenPalette = async () => {
    try { await invoke("show_palette"); } catch {}
  };

  const handleToggleFocus = async () => {
    try {
      const active = await invoke<boolean>("toggle_focus_mode");
      setFocusMode(active);
      if (Notification.permission === "granted") {
        new Notification("Aether", {
          body: active ? "⚡ Focus Mode Aktif — Ayo produktif!" : "Focus Mode Off. Selamat datang kembali!",
          silent: true,
        });
      }
      await fetchData();
    } catch {}
  };

  // ── Computed values
  const tasks = data?.tasks || [];
  const notes = allCaptures.filter(c => c.cap_type === "note");
  const pending = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);
  const progress = tasks.length > 0 ? (done.length / tasks.length) * 100 : 0;
  const quote = QUOTES[quoteIdx];

  const timeStr = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const secStr = String(currentTime.getSeconds()).padStart(2, "0");

  const dayName = data?.date?.split(",")[0]?.trim() || "";
  const dateRest = data?.date?.split(",").slice(1).join(",").trim() || "";

  // ── Border color based on state
  const borderColor = focusMode
    ? "rgba(99,102,241,0.55)"
    : isPinned
    ? "rgba(251,191,36,0.45)"
    : "rgba(255,255,255,0.09)";

  const glowColor = focusMode
    ? "rgba(99,102,241,0.18)"
    : isPinned
    ? "rgba(251,191,36,0.12)"
    : "rgba(0,0,0,0)";

  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      borderRadius: "20px",
      overflow: "hidden",
      background: "linear-gradient(170deg, rgba(14,14,20,0.99) 0%, rgba(9,9,14,0.99) 100%)",
      border: `1.5px solid ${borderColor}`,
      boxShadow: `0 20px 70px rgba(0,0,0,0.65), 0 4px 20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 40px ${glowColor}`,
      fontFamily: "'Segoe UI Variable', 'Segoe UI', -apple-system, sans-serif",
      userSelect: "none",
      transition: "border 0.35s ease, box-shadow 0.35s ease",
    }}>

      {/* ══════════════════════════════════════════
          HEADER — Clock, Date, Controls
      ══════════════════════════════════════════ */}
      <div
        onMouseDown={handleDrag}
        style={{
          padding: "16px 16px 12px",
          background: "rgba(255,255,255,0.015)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          cursor: "grab",
          flexShrink: 0,
        }}
      >
        {/* Top row: Clock + Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {/* Clock */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
              <span style={{
                fontSize: "32px", fontWeight: 700, letterSpacing: "-1px",
                color: "#f1f5f9", lineHeight: 1,
              }}>
                {timeStr}
              </span>
              <span style={{ fontSize: "14px", color: "#334155", fontWeight: 400, minWidth: "20px" }}>
                :{secStr}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginTop: "3px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>{dayName}</span>
              <span style={{ fontSize: "12px", color: "#475569" }}>{dateRest}</span>
            </div>
          </div>

          {/* Control buttons */}
          <div
            style={{ display: "flex", gap: "6px", alignItems: "center" }}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Pin button */}
            <Btn
              onClick={handlePin}
              active={isPinned}
              activeColor="rgba(251,191,36,0.2)"
              activeBorder="rgba(251,191,36,0.45)"
              activeTextColor="#fbbf24"
              title={isPinned ? "Lepas pin" : "Pin di atas"}
            >
              📌
            </Btn>

            {/* Focus button */}
            <button
              onClick={handleToggleFocus}
              onMouseDown={e => e.stopPropagation()}
              style={{
                padding: "5px 11px",
                borderRadius: "9px",
                border: focusMode ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.1)",
                background: focusMode ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                color: focusMode ? "#a5b4fc" : "#475569",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.03em",
                transition: "all 0.2s",
              }}
            >
              {focusMode ? "⚡ Focus" : "Focus"}
            </button>

            {/* Add button */}
            <Btn
              onClick={handleOpenPalette}
              active={false}
              activeColor=""
              activeBorder=""
              activeTextColor=""
              title="Tambah catatan / tugas"
              style={{
                border: "1px solid rgba(99,102,241,0.4)",
                background: "rgba(99,102,241,0.12)",
                color: "#a5b4fc",
                fontSize: "18px",
                fontWeight: 300,
              }}
            >
              +
            </Btn>
          </div>
        </div>

        {/* Task Progress Bar */}
        {tasks.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{
                fontSize: "9px", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "#334155",
              }}>
                Progress Hari Ini
              </span>
              <span style={{
                fontSize: "10px", fontWeight: 700,
                color: progress === 100 ? "#4ade80" : "#475569",
                transition: "color 0.3s",
              }}>
                {done.length}/{tasks.length} &nbsp;·&nbsp; {Math.round(progress)}%
              </span>
            </div>
            <div style={{
              height: "5px", borderRadius: "5px",
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${progress}%`,
                borderRadius: "5px",
                background: progress === 100
                  ? "linear-gradient(90deg, #4ade80, #22d3ee)"
                  : focusMode
                  ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
                  : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          QUOTE STRIP — Auto-rotating motivational
      ══════════════════════════════════════════ */}
      <div
        onClick={handleNextQuote}
        onMouseDown={e => e.stopPropagation()}
        title="Klik untuk quote berikutnya"
        style={{
          padding: "11px 16px 10px",
          background: `linear-gradient(135deg, rgba(${hexToRgb(quote.accent)},0.07) 0%, rgba(${hexToRgb(quote.accent)},0.02) 100%)`,
          borderBottom: `1px solid rgba(${hexToRgb(quote.accent)},0.12)`,
          cursor: "pointer",
          flexShrink: 0,
          opacity: quoteVisible ? 1 : 0,
          transition: "opacity 0.45s ease",
          position: "relative",
        }}
      >
        {/* Decorative quote mark */}
        <div style={{
          position: "absolute", top: "5px", left: "12px",
          fontSize: "30px", lineHeight: 1,
          color: `rgba(${hexToRgb(quote.accent)},0.2)`,
          fontFamily: "Georgia, serif",
          pointerEvents: "none",
        }}>"</div>

        <p style={{
          margin: 0,
          fontSize: "12px", lineHeight: "1.6",
          color: "#c8d3e0",
          paddingLeft: "18px",
          paddingRight: "20px",
          fontStyle: "italic",
          letterSpacing: "0.01em",
        }}>
          {quote.text}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "5px" }}>
          <p style={{
            margin: 0,
            fontSize: "10px",
            color: quote.accent,
            fontWeight: 700,
            letterSpacing: "0.04em",
            paddingLeft: "18px",
          }}>
            — {quote.author}
          </p>
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.12)", fontStyle: "normal" }}>
            tap ›
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          TABS
      ══════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          padding: "8px 10px 6px",
          gap: "4px",
          flexShrink: 0,
          background: "rgba(0,0,0,0.15)",
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {(["tasks", "notes", "motivasi"] as const).map(tab => {
          const count = tab === "tasks" ? pending.length
            : tab === "notes" ? notes.length
            : QUOTES.length;
          const icons = { tasks: "📋", notes: "📝", motivasi: "✨" };
          const labels = { tasks: "Tugas", notes: "Catatan", motivasi: "Motivasi" };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "6px 4px",
                borderRadius: "9px",
                border: isActive ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                background: isActive ? "rgba(99,102,241,0.18)" : "transparent",
                color: isActive ? "#a5b4fc" : "#374151",
                fontSize: "11px",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.01em",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1px",
              }}
            >
              <span style={{ fontSize: "14px" }}>{icons[tab]}</span>
              <span>{labels[tab]}{count > 0 && tab !== "motivasi" ? ` (${count})` : ""}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          CONTENT AREA
      ══════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "6px 12px 4px",
          scrollbarWidth: "none",
        }}
        onMouseDown={e => e.stopPropagation()}
      >

        {/* ── TASKS TAB ── */}
        {activeTab === "tasks" && (
          tasks.length === 0 ? (
            <EmptyState icon="✅" title="Tidak ada tugas" sub='Tekan "+" untuk menambah tugas baru' />
          ) : (
            <>
              {pending.length > 0 && (
                <div style={{ marginBottom: "4px" }}>
                  <SLabel text={`Belum Selesai  (${pending.length})`} />
                  {pending.map(t => (
                    <TaskRow key={t.id} task={t} onToggle={handleToggleTask} />
                  ))}
                </div>
              )}
              {done.length > 0 && (
                <div>
                  <SLabel text={`Selesai ✓  (${done.length})`} />
                  {done.map(t => (
                    <TaskRow key={t.id} task={t} onToggle={handleToggleTask} />
                  ))}
                </div>
              )}
            </>
          )
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === "notes" && (
          notes.length === 0 ? (
            <EmptyState icon="📝" title="Belum ada catatan" sub='Tekan "+" untuk menulis catatan baru' />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "4px" }}>
              {notes.map((n, idx) => (
                <NoteCard key={n.id} note={n} index={idx} />
              ))}
            </div>
          )
        )}

        {/* ── MOTIVASI TAB — Full curated quote list ── */}
        {activeTab === "motivasi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px" }}>
            {QUOTES.map((q, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: `rgba(${hexToRgb(q.accent)},0.05)`,
                  border: `1px solid rgba(${hexToRgb(q.accent)},0.15)`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Accent left bar */}
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: "3px",
                  background: `linear-gradient(180deg, ${q.accent}, transparent)`,
                  borderRadius: "3px 0 0 3px",
                }} />
                <p style={{
                  margin: 0,
                  fontSize: "12px", color: "#e2e8f0",
                  lineHeight: "1.6", fontStyle: "italic",
                  paddingLeft: "2px",
                }}>
                  "{q.text}"
                </p>
                <p style={{
                  margin: "6px 0 0 2px",
                  fontSize: "10px", color: q.accent,
                  fontWeight: 700, letterSpacing: "0.04em",
                }}>
                  — {q.author}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          FOOTER — Drag region + Status
      ══════════════════════════════════════════ */}
      <div
        onMouseDown={handleDrag}
        style={{
          padding: "7px 16px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "grab",
          flexShrink: 0,
        }}
      >
        <span style={{
          fontSize: "9px", color: "#1e293b",
          letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
        }}>
          Alt+Space · Capture
        </span>
        <span style={{
          fontSize: "9px", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: isPinned ? "#fbbf24" : focusMode ? "#818cf8" : "#1e293b",
          transition: "color 0.3s",
        }}>
          {isPinned ? "📌 PINNED" : focusMode ? "⚡ FOCUS" : "✦ AETHER"}
        </span>
      </div>
    </div>
  );
}

// ══ SUB-COMPONENTS ════════════════════════════════════════════

function Btn({
  children,
  onClick,
  active,
  activeColor,
  activeBorder,
  activeTextColor,
  title,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  activeColor: string;
  activeBorder: string;
  activeTextColor: string;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      onMouseDown={e => e.stopPropagation()}
      title={title}
      style={{
        width: "30px", height: "30px",
        borderRadius: "9px",
        border: active ? `1px solid ${activeBorder}` : "1px solid rgba(255,255,255,0.1)",
        background: active ? activeColor : "rgba(255,255,255,0.04)",
        color: active ? activeTextColor : "#475569",
        fontSize: "14px",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: "9px", fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase",
      color: "#334155",
      padding: "6px 2px 5px",
    }}>
      {text}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
}: {
  task: { id: number; text: string; completed: boolean };
  onToggle: (id: number) => void;
}) {
  return (
    <div
      onClick={() => onToggle(task.id)}
      style={{
        display: "flex", alignItems: "flex-start", gap: "10px",
        padding: "8px 10px",
        marginBottom: "3px",
        borderRadius: "10px",
        cursor: "pointer",
        background: task.completed ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${task.completed ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)"}`,
        transition: "background 0.15s",
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: "17px", height: "17px", minWidth: "17px",
        borderRadius: "5px",
        border: task.completed ? "2px solid #6366f1" : "2px solid rgba(255,255,255,0.18)",
        background: task.completed
          ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
          : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: "1px",
        transition: "all 0.2s",
        flexShrink: 0,
      }}>
        {task.completed && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Text */}
      <span style={{
        fontSize: "13px",
        lineHeight: "1.45",
        color: task.completed ? "#2d3748" : "#e2e8f0",
        textDecoration: task.completed ? "line-through" : "none",
        wordBreak: "break-word",
        flex: 1,
        transition: "color 0.2s",
      }}>
        {task.text}
      </span>
    </div>
  );
}

function NoteCard({ note, index }: { note: { id: number; text: string }; index: number }) {
  // Cycle through subtle accent colors for note cards
  const accents = ["#818cf8", "#34d399", "#f59e0b", "#38bdf8", "#e879f9", "#fb923c"];
  const accent = accents[index % accents.length];

  return (
    <div style={{
      padding: "11px 14px",
      borderRadius: "11px",
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Accent top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "2px",
        background: `linear-gradient(90deg, ${accent}, transparent)`,
      }} />
      <p style={{
        margin: 0,
        fontSize: "13px", color: "#d1d9e6",
        lineHeight: "1.55",
        wordBreak: "break-word",
      }}>
        {note.text}
      </p>
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "36px 20px", gap: "8px",
    }}>
      <span style={{ fontSize: "32px", lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginTop: "4px" }}>
        {title}
      </span>
      <span style={{ fontSize: "11px", color: "#1e293b", textAlign: "center", lineHeight: 1.5 }}>
        {sub}
      </span>
    </div>
  );
}
