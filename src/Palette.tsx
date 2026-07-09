import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function Palette() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
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
        const searchRes = await invoke<string[]>("search_captures", { query: trimmed });
        setResults(searchRes);
      } catch (err) {
        console.error("Search failed:", err);
      }
    } else {
      setResults([]);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const trimmed = text.trim();
      if (trimmed) {
        try {
          // Persist capture to SQLite database
          await invoke("save_capture", { text: trimmed });
          // Clear input text and results
          setText("");
          setResults([]);
          // Hide palette window
          await invoke("hide_window");
        } catch (error) {
          console.error("Failed to save capture:", error);
        }
      }
    } else if (e.key === "Escape") {
      // Discard input text and results
      setText("");
      setResults([]);
      // Hide palette window
      invoke("hide_window").catch(console.error);
    }
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
              key={idx}
              className="px-3 py-2 text-neutral-300 rounded-lg text-sm font-light truncate"
            >
              {res}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
