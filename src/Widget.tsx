import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

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
  const [focusMode, setFocusMode] = useState(false);

  const fetchWidgetData = async () => {
    try {
      const widgetData = await invoke<WidgetData>("get_widget_data");
      setData(widgetData);
      setFocusMode(widgetData.focus_mode);
    } catch (err) {
      console.error("Failed to fetch widget data:", err);
    }
  };

  useEffect(() => {
    // Request notification permissions on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Initial fetch
    fetchWidgetData();

    // Setup polling every 2 seconds to synchronize new captures from the launcher
    const interval = setInterval(fetchWidgetData, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleTask = async (id: number) => {
    try {
      await invoke("toggle_task_completion", { id });
      // Instantly refresh widget data
      await fetchWidgetData();
    } catch (err) {
      console.error("Failed to toggle task completion:", err);
    }
  };

  const handleToggleFocus = async () => {
    try {
      const active = await invoke<boolean>("toggle_focus_mode");
      setFocusMode(active);
      if (Notification.permission === "granted") {
        new Notification("Aether Focus Mode", {
          body: active 
            ? "Focus Mode Active. Go make progress!" 
            : "Focus Mode Off. Welcome back.",
          silent: true
        });
      }
      // Refresh list
      await fetchWidgetData();
    } catch (err) {
      console.error("Failed to toggle focus mode:", err);
    }
  };

  // Filter tasks to show only top priority task in Focus Mode
  const tasksToRender = data 
    ? (focusMode ? data.tasks.slice(0, 1) : data.tasks)
    : [];

  return (
    <div className={`w-full h-full p-4 bg-[#0E0E10]/75 backdrop-blur-md border rounded-2xl flex flex-col justify-between text-white font-sans select-none shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${
      focusMode 
        ? "border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
        : "border-neutral-800/40"
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center border-b border-neutral-800/30 pb-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
            {focusMode ? "Focusing" : "Surfaced"}
          </span>
          <span className="text-sm font-semibold text-neutral-200">{data?.date || "Today"}</span>
        </div>
        {/* Focus Mode Pill Toggle */}
        <button 
          onClick={handleToggleFocus}
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide transition-all duration-200 cursor-pointer outline-none ${
            focusMode 
              ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]" 
              : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          {focusMode ? "Focusing" : "Focus"}
        </button>
      </div>

      {/* Tasks List */}
      <div className="flex-1 flex flex-col gap-2 my-2 justify-center">
        {tasksToRender.length > 0 ? (
          tasksToRender.map((task) => (
            <div 
              key={task.id} 
              onClick={() => handleToggleTask(task.id)}
              className="flex items-center text-xs font-light text-neutral-300 cursor-pointer hover:text-white transition-colors duration-150"
            >
              <div className="w-3.5 h-3.5 rounded border border-neutral-700 bg-neutral-900/60 flex items-center justify-center mr-2 text-transparent transition-all duration-150">
                <svg className="w-2 h-2 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <span className="truncate flex-1">{task.text}</span>
            </div>
          ))
        ) : (
          <div className="text-[11px] text-neutral-500 italic text-center py-2">
            No pending tasks today
          </div>
        )}
      </div>

      {/* Footer */}
      {!focusMode && (
        <div className="border-t border-neutral-800/30 pt-2 flex flex-col transition-all duration-200">
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-semibold">Latest Note</span>
          <span className="text-xs font-light text-neutral-400 italic truncate mt-0.5">
            {data?.last_note || "No notes captured yet"}
          </span>
        </div>
      )}
    </div>
  );
}
