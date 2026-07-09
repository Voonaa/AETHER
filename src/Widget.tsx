import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface SearchResult {
  id: number;
  text: string;
  cap_type: string;
  completed: boolean;
}

interface WidgetData {
  date: string;
  tasks: SearchResult[];
  last_note: string | null;
  focus_mode: boolean;
}

export default function Widget() {
  const [data, setData] = useState<WidgetData | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "notes">("tasks");
  const [focusMode, setFocusMode] = useState(false);
  const [allCaptures, setAllCaptures] = useState<SearchResult[]>([]);
  const appWindow = getCurrentWindow();

  const fetchWidgetData = async () => {
    try {
      const widgetData = await invoke<WidgetData>("get_widget_data");
      setData(widgetData);
      setFocusMode(widgetData.focus_mode);

      // Fetch all captures for the notes tab
      const results = await invoke<SearchResult[]>("search_captures", { query: "" });
      setAllCaptures(results);
    } catch (err) {
      console.error("Failed to fetch widget data:", err);
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    fetchWidgetData();
    const interval = setInterval(fetchWidgetData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleTask = async (id: number) => {
    try {
      await invoke("toggle_task_completion", { id });
      await fetchWidgetData();
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleToggleFocus = async () => {
    try {
      const active = await invoke<boolean>("toggle_focus_mode");
      setFocusMode(active);
      if (Notification.permission === "granted") {
        new Notification("Aether", {
          body: active ? "Focus Mode Active 🎯" : "Focus Mode Off. Welcome back!",
          silent: true,
        });
      }
      await fetchWidgetData();
    } catch (err) {
      console.error("Failed to toggle focus:", err);
    }
  };

  const handleOpenPalette = async () => {
    try {
      await invoke("show_palette");
    } catch (err) {
      console.error("Failed to show palette:", err);
    }
  };

  // Drag using Tauri native drag
  const handleDragStart = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await appWindow.startDragging();
    } catch (err) {
      console.error("Drag failed:", err);
    }
  };

  const tasks = data?.tasks || [];
  const notes = allCaptures.filter((c) => c.cap_type === "note");
  const pendingTasks = tasks.filter((t) => !t.completed);
  const doneTasks = tasks.filter((t) => t.completed);

  const dayName = data?.date?.split(",")[0] || "";
  const dateRest = data?.date?.split(",").slice(1).join(",").trim() || "";

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        fontFamily: "'Segoe UI Variable', 'Segoe UI', -apple-system, sans-serif",
        userSelect: "none",
      }}
    >
      {/* Main Card */}
      <div
        className="flex flex-col w-full h-full rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "rgba(18, 18, 22, 0.97)",
          border: focusMode
            ? "1.5px solid rgba(99,102,241,0.6)"
            : "1.5px solid rgba(255,255,255,0.10)",
          boxShadow: focusMode
            ? "0 8px 40px rgba(99,102,241,0.18), 0 2px 8px rgba(0,0,0,0.7)"
            : "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.7)",
        }}
      >
        {/* ═══ HEADER (Drag Region) ═══ */}
        <div
          onMouseDown={handleDragStart}
          className="flex items-center justify-between px-4 pt-4 pb-3 cursor-grab active:cursor-grabbing"
          style={{
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex flex-col">
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: focusMode ? "#818cf8" : "#6b7280",
              }}
            >
              {focusMode ? "⚡ Focusing" : "✦ Aether"}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>
                {dayName}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 400, color: "#94a3b8" }}>
                {dateRest}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Focus Toggle */}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleToggleFocus}
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                border: focusMode
                  ? "1px solid rgba(99,102,241,0.5)"
                  : "1px solid rgba(255,255,255,0.12)",
                background: focusMode
                  ? "rgba(99,102,241,0.2)"
                  : "rgba(255,255,255,0.06)",
                color: focusMode ? "#a5b4fc" : "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              {focusMode ? "Focusing" : "Focus"}
            </button>

            {/* Add Button */}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleOpenPalette}
              title="Add note or task"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                fontSize: "18px",
                fontWeight: 400,
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                transition: "all 0.2s",
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* ═══ TAB BAR ═══ */}
        <div
          className="flex px-4 gap-1 pt-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {(["tasks", "notes"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "5px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background:
                  activeTab === tab
                    ? "rgba(99,102,241,0.25)"
                    : "transparent",
                color: activeTab === tab ? "#a5b4fc" : "#6b7280",
                transition: "all 0.15s",
                letterSpacing: "0.02em",
              }}
            >
              {tab === "tasks"
                ? `📋 Tasks ${pendingTasks.length > 0 ? `(${pendingTasks.length})` : ""}`
                : `📝 Notes ${notes.length > 0 ? `(${notes.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* ═══ CONTENT ═══ */}
        <div
          className="flex-1 overflow-y-auto px-4 py-2"
          onMouseDown={(e) => e.stopPropagation()}
          style={{ scrollbarWidth: "none" }}
        >
          {/* TASKS TAB */}
          {activeTab === "tasks" && (
            <div className="flex flex-col gap-1">
              {tasks.length === 0 ? (
                <EmptyState
                  icon="✅"
                  title="Tidak ada tugas"
                  subtitle='Tekan + untuk menambah tugas baru'
                />
              ) : (
                <>
                  {/* Pending */}
                  {pendingTasks.length > 0 && (
                    <div className="mb-2">
                      <SectionLabel text="Belum Selesai" />
                      {pendingTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={handleToggleTask}
                        />
                      ))}
                    </div>
                  )}

                  {/* Done */}
                  {doneTasks.length > 0 && (
                    <div>
                      <SectionLabel text="Selesai" />
                      {doneTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={handleToggleTask}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === "notes" && (
            <div className="flex flex-col gap-2">
              {notes.length === 0 ? (
                <EmptyState
                  icon="📝"
                  title="Belum ada catatan"
                  subtitle='Tekan + untuk menambah catatan baru'
                />
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#e2e8f0",
                        lineHeight: "1.55",
                        margin: 0,
                        wordBreak: "break-word",
                      }}
                    >
                      {note.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        <div
          onMouseDown={handleDragStart}
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "grab",
          }}
        >
          <span style={{ fontSize: "10px", color: "#4b5563", letterSpacing: "0.08em" }}>
            ALT+SPACE untuk capture
          </span>
          <span
            style={{
              fontSize: "10px",
              color: focusMode ? "#818cf8" : "#374151",
              fontWeight: 600,
            }}
          >
            {focusMode ? "FOCUS ON" : "AETHER"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-Components ── */

function SectionLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#4b5563",
        marginBottom: "6px",
        marginTop: "4px",
      }}
    >
      {text}
    </div>
  );
}

function TaskItem({
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
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "8px 10px",
        borderRadius: "10px",
        marginBottom: "4px",
        cursor: "pointer",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        transition: "all 0.15s",
      }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: "18px",
          height: "18px",
          minWidth: "18px",
          borderRadius: "5px",
          border: task.completed
            ? "2px solid #6366f1"
            : "2px solid rgba(255,255,255,0.2)",
          background: task.completed ? "#6366f1" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "1px",
          transition: "all 0.15s",
        }}
      >
        {task.completed && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Text */}
      <span
        style={{
          fontSize: "13px",
          color: task.completed ? "#4b5563" : "#e2e8f0",
          lineHeight: "1.4",
          textDecoration: task.completed ? "line-through" : "none",
          flex: 1,
          wordBreak: "break-word",
        }}
      >
        {task.text}
      </span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        gap: "8px",
      }}
    >
      <span style={{ fontSize: "32px" }}>{icon}</span>
      <span style={{ fontSize: "14px", fontWeight: 600, color: "#6b7280" }}>
        {title}
      </span>
      <span style={{ fontSize: "11px", color: "#374151", textAlign: "center" }}>
        {subtitle}
      </span>
    </div>
  );
}
