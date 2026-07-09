import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SearchResult {
  id: number;
  text: string;
  cap_type: string;
  completed: boolean;
}

export default function Palette() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    // Request notification permissions on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Focus immediately on mount
    focusInput();

    // Re-focus whenever the window gains focus (shown via Alt+Space)
    const handleWindowFocus = () => {
      focusInput();
    };

    // Clean up state and hide when window loses focus (click elsewhere)
    const handleWindowBlur = () => {
      setText("");
      setResults([]);
      setSelectedIndex(-1);
      invoke("hide_window").catch(console.error);
    };

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  const handleInputChange = async (val: string) => {
    setText(val);
    const trimmed = val.trim();
    if (trimmed.length > 0) {
      try {
        const searchRes = await invoke<SearchResult[]>("search_captures", { query: trimmed });
        setResults(searchRes);
      } catch (err) {
        console.error("Search failed:", err);
      }
    } else {
      setResults([]);
    }
    setSelectedIndex(-1); // Reset selected result on text change
  };

  const handleSelectAction = async (item: SearchResult) => {
    if (item.cap_type === "task") {
      try {
        // Toggle task completion in SQLite database
        await invoke("toggle_task_completion", { id: item.id });
        console.log("Toggled task completion for:", item.text);
        setText("");
        setResults([]);
        setSelectedIndex(-1);
        await invoke("hide_window");
      } catch (err) {
        console.error("Failed to toggle task:", err);
      }
    } else {
      try {
        // Copy standard note to clipboard
        await navigator.clipboard.writeText(item.text);
        console.log("Copied to clipboard:", item.text);
        setText("");
        setResults([]);
        setSelectedIndex(-1);
        await invoke("hide_window");
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev + 1 >= results.length ? -1 : prev + 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev - 1 < -1 ? results.length - 1 : prev - 1));
      }
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        await handleSelectAction(results[selectedIndex]);
      } else {
        const trimmed = text.trim();
        if (trimmed) {
          try {
            // Persist capture to SQLite database
            const status = await invoke<string>("save_capture", { text: trimmed });
            
            // Check if Focus Mode was toggled via slash command
            if ((status === "focus_enabled" || status === "focus_disabled") && Notification.permission === "granted") {
              new Notification("Aether Focus Mode", {
                body: status === "focus_enabled"
                  ? "Focus Mode Active. Go make progress!"
                  : "Focus Mode Off. Welcome back.",
                silent: true
              });
            }

            // Clear input text and results
            setText("");
            setResults([]);
            setSelectedIndex(-1);
            // Hide palette window
            await invoke("hide_window");
          } catch (error) {
            console.error("Failed to save capture:", error);
          }
        }
      }
    } else if (e.key === "Escape") {
      // Discard input text and results
      setText("");
      setResults([]);
      setSelectedIndex(-1);
      // Hide palette window
      invoke("hide_window").catch(console.error);
    }
  };

  const renderCheckbox = (completed: boolean) => {
    return (
      <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2.5 transition-all duration-150 ${
        completed 
          ? "bg-indigo-500 border-indigo-500 text-indigo-100" 
          : "border-neutral-600 bg-neutral-900/40 text-transparent"
      }`}>
        <svg className="w-2.5 h-2.5 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-1 bg-transparent select-none">
      {/* Input Wrapper */}
      <div className="w-full h-[52px] min-h-[52px] bg-[#0E0E10]/95 backdrop-blur-xl border border-neutral-800/80 rounded-xl flex items-center px-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Capture a thought or search..."
          className="w-full bg-transparent text-white text-lg font-light outline-none placeholder-neutral-500 selection:bg-indigo-500/30 selection:text-indigo-200"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>

      {/* Results List */}
      {results.length > 0 && (
        <div className="w-full flex flex-col gap-1 mt-2 bg-[#0E0E10]/95 backdrop-blur-xl border border-neutral-800/80 rounded-xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          {results.map((res, idx) => (
            <div
              key={res.id}
              onClick={() => handleSelectAction(res)}
              className={`px-3 py-2 rounded-lg text-sm font-light truncate cursor-pointer flex items-center transition-colors duration-100 ${
                idx === selectedIndex
                  ? "bg-indigo-500/20 text-indigo-200 border-l-2 border-indigo-500 pl-2.5"
                  : "text-neutral-300 hover:bg-neutral-800/50"
              }`}
            >
              {res.cap_type === "task" && renderCheckbox(res.completed)}
              <span className="flex-1 truncate">{res.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
