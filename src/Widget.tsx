import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

// ── Types ─────────────────────────────────────────────────────
interface Task { id: number; text: string; cap_type: string; completed: boolean; }
interface WidgetData { date: string; tasks: Task[]; last_note: string | null; focus_mode: boolean; }
interface Motivation { id: number; text: string; author: string; }

// ── Accent palette for notes ──────────────────────────────────
const NOTE_ACCENTS = ["#818cf8","#34d399","#f59e0b","#38bdf8","#e879f9","#fb923c","#a3e635","#f472b6"];
const QUOTE_ACCENTS = ["#818cf8","#34d399","#f59e0b","#a78bfa","#38bdf8","#4ade80","#e879f9","#facc15","#fb923c","#f472b6","#67e8f9","#86efac","#fca5a5","#c4b5fd","#6ee7b7"];
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

const appWindow = getCurrentWindow();

// ═════════════════════════════════════════════════════════════
//  MAIN WIDGET
// ═════════════════════════════════════════════════════════════
export default function Widget() {
  const [data, setData]             = useState<WidgetData | null>(null);
  const [allCaptures, setCaptures]  = useState<Task[]>([]);
  const [motivations, setMotivations] = useState<Motivation[]>([]);
  const [activeTab, setActiveTab]   = useState<"tasks"|"notes"|"motivasi">("tasks");
  const [focusMode, setFocusMode]   = useState(false);
  const [isPinned, setIsPinned]     = useState(false);
  const [quoteIdx, setQuoteIdx]     = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [time, setTime]             = useState(new Date());

  // Inline add states
  const [addingTask, setAddingTask]   = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [addingNote, setAddingNote]   = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  // Motivation form states
  const [addingMotiv, setAddingMotiv]   = useState(false);
  const [newMotivText, setNewMotivText] = useState("");
  const [newMotivAuthor, setNewMotivAuthor] = useState("");
  const [editingMotiv, setEditingMotiv] = useState<Motivation | null>(null);

  const taskInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const motivTextRef = useRef<HTMLTextAreaElement>(null);

  // ── Live clock ──────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Quote rotation every 15s ────────────────────────────────
  useEffect(() => {
    if (motivations.length === 0) return;
    const t = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % motivations.length);
        setQuoteVisible(true);
      }, 500);
    }, 15000);
    return () => clearInterval(t);
  }, [motivations.length]);

  // ── Data fetch ──────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const wd = await invoke<WidgetData>("get_widget_data");
      setData(wd); setFocusMode(wd.focus_mode);
      const caps = await invoke<Task[]>("search_captures", { query: "" });
      setCaptures(caps);
    } catch {}
  };
  const fetchMotivations = async () => {
    try {
      const ms = await invoke<Motivation[]>("get_motivations");
      setMotivations(ms);
    } catch {}
  };

  useEffect(() => {
    fetchData();
    fetchMotivations();
    const iv = setInterval(fetchData, 4000);
    return () => clearInterval(iv);
  }, []);

  // Focus input when opening inline add
  useEffect(() => { if (addingTask) taskInputRef.current?.focus(); }, [addingTask]);
  useEffect(() => { if (addingNote) noteInputRef.current?.focus(); }, [addingNote]);
  useEffect(() => { if (addingMotiv || editingMotiv) motivTextRef.current?.focus(); }, [addingMotiv, editingMotiv]);

  // ── Handlers ────────────────────────────────────────────────
  const handleDrag = async (e: React.MouseEvent) => {
    e.preventDefault();
    try { await appWindow.startDragging(); } catch {}
  };
  const handlePin = async () => {
    const next = !isPinned; setIsPinned(next);
    try { await appWindow.setAlwaysOnTop(next); } catch {}
  };
  const handleToggleFocus = async () => {
    try {
      const active = await invoke<boolean>("toggle_focus_mode");
      setFocusMode(active);
      await fetchData();
    } catch {}
  };
  const handleToggleTask = async (id: number) => {
    try { await invoke("toggle_task_completion", { id }); await fetchData(); } catch {}
  };
  const handleDeleteCapture = async (id: number) => {
    try { await invoke("delete_capture", { id }); await fetchData(); } catch {}
  };

  // Save new task inline
  const submitTask = async () => {
    if (!newTaskText.trim()) { setAddingTask(false); return; }
    try {
      await invoke("save_widget_capture", { text: newTaskText.trim(), capType: "task" });
      setNewTaskText(""); setAddingTask(false);
      await fetchData();
    } catch {}
  };

  // Save new note inline
  const submitNote = async () => {
    if (!newNoteText.trim()) { setAddingNote(false); return; }
    try {
      await invoke("save_widget_capture", { text: newNoteText.trim(), capType: "note" });
      setNewNoteText(""); setAddingNote(false);
      await fetchData();
    } catch {}
  };

  // Motivation CRUD
  const submitMotivation = async () => {
    if (!newMotivText.trim()) return;
    try {
      if (editingMotiv) {
        await invoke("update_motivation", { id: editingMotiv.id, text: newMotivText.trim(), author: newMotivAuthor.trim() || "Anonim" });
      } else {
        await invoke("add_motivation", { text: newMotivText.trim(), author: newMotivAuthor.trim() || "Anonim" });
      }
      setNewMotivText(""); setNewMotivAuthor(""); setAddingMotiv(false); setEditingMotiv(null);
      await fetchMotivations();
    } catch {}
  };
  const startEditMotiv = (m: Motivation) => {
    setEditingMotiv(m); setNewMotivText(m.text); setNewMotivAuthor(m.author);
    setAddingMotiv(false);
  };
  const cancelMotivForm = () => {
    setEditingMotiv(null); setAddingMotiv(false); setNewMotivText(""); setNewMotivAuthor("");
  };
  const deleteMotiv = async (id: number) => {
    try { await invoke("delete_motivation", { id }); await fetchMotivations(); } catch {}
  };
  const nextQuote = () => {
    if (motivations.length === 0) return;
    setQuoteVisible(false);
    setTimeout(() => { setQuoteIdx(i => (i + 1) % motivations.length); setQuoteVisible(true); }, 300);
  };

  // ── Computed ────────────────────────────────────────────────
  const tasks   = data?.tasks || [];
  const notes   = allCaptures.filter(c => c.cap_type === "note");
  const pending = tasks.filter(t => !t.completed);
  const done    = tasks.filter(t => t.completed);
  const progress = tasks.length > 0 ? (done.length / tasks.length) * 100 : 0;
  const quote = motivations[quoteIdx % Math.max(motivations.length, 1)];
  const quoteAccent = QUOTE_ACCENTS[quoteIdx % QUOTE_ACCENTS.length];

  const timeStr = time.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", hour12: false });
  const secStr  = String(time.getSeconds()).padStart(2,"0");
  const dayName = data?.date?.split(",")[0]?.trim() || "";
  const dateRest = data?.date?.split(",").slice(1).join(",").trim() || "";

  const borderColor = focusMode ? "rgba(99,102,241,0.5)" : isPinned ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.09)";

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{
      width:"100%", height:"100%", display:"flex", flexDirection:"column",
      borderRadius:"20px", overflow:"hidden",
      background:"linear-gradient(160deg, rgba(13,13,20,0.99) 0%, rgba(9,9,14,0.99) 100%)",
      border:`1.5px solid ${borderColor}`,
      boxShadow:"0 20px 70px rgba(0,0,0,0.7), 0 4px 20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
      fontFamily:"'Segoe UI Variable','Segoe UI',-apple-system,sans-serif",
      userSelect:"none",
      transition:"border 0.3s ease, box-shadow 0.3s ease",
    }}>

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <div onMouseDown={handleDrag} style={{
        padding:"14px 16px 10px", flexShrink:0,
        background:"rgba(255,255,255,0.015)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        cursor:"grab",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          {/* Clock */}
          <div>
            <div style={{ display:"flex", alignItems:"baseline", gap:"3px" }}>
              <span style={{ fontSize:"30px", fontWeight:700, letterSpacing:"-1px", color:"#f1f5f9", lineHeight:1 }}>
                {timeStr}
              </span>
              <span style={{ fontSize:"14px", color:"#2d3748", fontWeight:400 }}>:{secStr}</span>
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:"5px", marginTop:"2px" }}>
              <span style={{ fontSize:"13px", fontWeight:600, color:"#e2e8f0" }}>{dayName}</span>
              <span style={{ fontSize:"11px", color:"#4b5563" }}>{dateRest}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display:"flex", gap:"6px", alignItems:"center" }} onMouseDown={e=>e.stopPropagation()}>
            <IBtn onClick={handlePin} title={isPinned?"Lepas pin":"Pin di atas"}
              active={isPinned} activeColor="rgba(251,191,36,0.2)" activeBorder="rgba(251,191,36,0.4)" activeText="#fbbf24">
              📌
            </IBtn>
            <button onClick={handleToggleFocus} onMouseDown={e=>e.stopPropagation()} style={{
              padding:"4px 10px", borderRadius:"8px", fontSize:"11px", fontWeight:600, cursor:"pointer",
              border: focusMode ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.1)",
              background: focusMode ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
              color: focusMode ? "#a5b4fc" : "#4b5563",
              transition:"all 0.2s",
            }}>
              {focusMode ? "⚡ Focus" : "Focus"}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div style={{ marginTop:"10px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
              <span style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#374151" }}>Progress Hari Ini</span>
              <span style={{ fontSize:"10px", fontWeight:700, color: progress===100 ? "#4ade80" : "#4b5563", transition:"color 0.3s" }}>
                {done.length}/{tasks.length} · {Math.round(progress)}%
              </span>
            </div>
            <div style={{ height:"4px", borderRadius:"4px", background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
              <div style={{
                height:"100%", width:`${progress}%`, borderRadius:"4px",
                background: progress===100 ? "linear-gradient(90deg,#4ade80,#22d3ee)" : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                transition:"width 0.6s cubic-bezier(0.4,0,0.2,1)",
              }}/>
            </div>
          </div>
        )}
      </div>

      {/* ══ QUOTE STRIP ═════════════════════════════════════ */}
      {quote && (
        <div onClick={nextQuote} onMouseDown={e=>e.stopPropagation()} title="Klik untuk quote berikutnya" style={{
          padding:"10px 16px 9px", flexShrink:0, cursor:"pointer",
          background:`linear-gradient(135deg, rgba(${hexToRgb(quoteAccent)},0.08) 0%, rgba(${hexToRgb(quoteAccent)},0.02) 100%)`,
          borderBottom:`1px solid rgba(${hexToRgb(quoteAccent)},0.14)`,
          opacity: quoteVisible ? 1 : 0, transition:"opacity 0.45s ease",
          position:"relative",
        }}>
          <div style={{ position:"absolute", top:"4px", left:"12px", fontSize:"28px", lineHeight:1, color:`rgba(${hexToRgb(quoteAccent)},0.2)`, fontFamily:"Georgia,serif", pointerEvents:"none" }}>"</div>
          <p style={{ margin:0, fontSize:"11.5px", lineHeight:"1.6", color:"#c8d3e0", paddingLeft:"18px", paddingRight:"18px", fontStyle:"italic" }}>
            {quote.text}
          </p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"4px" }}>
            <p style={{ margin:0, fontSize:"10px", color:quoteAccent, fontWeight:700, paddingLeft:"18px" }}>— {quote.author}</p>
            <span style={{ fontSize:"9px", color:"rgba(255,255,255,0.12)" }}>tap ›</span>
          </div>
        </div>
      )}

      {/* ══ TABS ════════════════════════════════════════════ */}
      <div style={{ display:"flex", padding:"7px 10px 5px", gap:"4px", flexShrink:0, background:"rgba(0,0,0,0.12)" }} onMouseDown={e=>e.stopPropagation()}>
        {(["tasks","notes","motivasi"] as const).map(tab => {
          const cnt = tab==="tasks" ? pending.length : tab==="notes" ? notes.length : motivations.length;
          const icon = { tasks:"📋", notes:"📝", motivasi:"✨" }[tab];
          const label = { tasks:"Tugas", notes:"Catatan", motivasi:"Motivasi" }[tab];
          const active = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex:1, padding:"5px 4px", borderRadius:"9px", cursor:"pointer",
              border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
              background: active ? "rgba(99,102,241,0.18)" : "transparent",
              color: active ? "#a5b4fc" : "#374151",
              fontSize:"10.5px", fontWeight: active ? 700 : 500,
              display:"flex", flexDirection:"column", alignItems:"center", gap:"1px",
              transition:"all 0.2s",
            }}>
              <span style={{ fontSize:"13px" }}>{icon}</span>
              <span>{label}{cnt > 0 ? ` (${cnt})` : ""}</span>
            </button>
          );
        })}
      </div>

      {/* ══ CONTENT ═════════════════════════════════════════ */}
      <div style={{ flex:1, overflowY:"auto", padding:"6px 12px", scrollbarWidth:"none" }} onMouseDown={e=>e.stopPropagation()}>

        {/* ── TASKS TAB ─────────────────────────────────── */}
        {activeTab === "tasks" && (
          <div style={{ display:"flex", flexDirection:"column" }}>
            {pending.length === 0 && done.length === 0 && !addingTask && (
              <EmptyState icon="✅" title="Tidak ada tugas" sub='Ketuk "+ Tambah Tugas" untuk memulai' />
            )}

            {pending.length > 0 && <SLabel text={`Belum Selesai (${pending.length})`} />}
            {pending.map(t => (
              <TaskRow key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteCapture} />
            ))}

            {done.length > 0 && <SLabel text={`Selesai ✓ (${done.length})`} />}
            {done.map(t => (
              <TaskRow key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteCapture} />
            ))}

            {/* Inline add task */}
            {addingTask ? (
              <div style={{ display:"flex", gap:"6px", alignItems:"center", marginTop:"8px" }}>
                <input
                  ref={taskInputRef}
                  value={newTaskText}
                  onChange={e=>setNewTaskText(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter") submitTask(); if(e.key==="Escape"){setAddingTask(false);setNewTaskText("");} }}
                  placeholder="Tugas baru..."
                  style={{
                    flex:1, padding:"7px 10px", borderRadius:"8px",
                    background:"rgba(99,102,241,0.1)", border:"1.5px solid rgba(99,102,241,0.4)",
                    color:"#e2e8f0", fontSize:"12px", outline:"none",
                    userSelect:"text",
                  }}
                />
                <button onClick={submitTask} style={okBtnStyle}>✓</button>
                <button onClick={()=>{setAddingTask(false);setNewTaskText("");}} style={cancelBtnStyle}>✕</button>
              </div>
            ) : (
              <button onClick={()=>setAddingTask(true)} style={{
                marginTop:"10px", padding:"7px 10px",
                borderRadius:"9px", border:"1.5px dashed rgba(99,102,241,0.3)",
                background:"transparent", color:"#4b5563", fontSize:"12px", fontWeight:500,
                cursor:"pointer", width:"100%", textAlign:"left", letterSpacing:"0.02em",
                display:"flex", alignItems:"center", gap:"6px",
                transition:"all 0.2s",
              }}>
                <span style={{ fontSize:"16px", color:"rgba(99,102,241,0.6)" }}>+</span> Tambah Tugas
              </button>
            )}
          </div>
        )}

        {/* ── NOTES TAB ─────────────────────────────────── */}
        {activeTab === "notes" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"6px", paddingTop:"4px" }}>
            {notes.length === 0 && !addingNote && (
              <EmptyState icon="📝" title="Belum ada catatan" sub='Ketuk "+ Tambah Catatan" untuk menulis' />
            )}

            {notes.map((n, idx) => (
              <NoteCard key={n.id} note={n} accent={NOTE_ACCENTS[idx % NOTE_ACCENTS.length]} onDelete={handleDeleteCapture} />
            ))}

            {/* Inline add note */}
            {addingNote ? (
              <div style={{ marginTop:"6px" }}>
                <textarea
                  ref={noteInputRef}
                  value={newNoteText}
                  onChange={e=>setNewNoteText(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter" && e.ctrlKey) submitNote(); if(e.key==="Escape"){setAddingNote(false);setNewNoteText("");} }}
                  placeholder="Tulis catatan... (Ctrl+Enter untuk simpan)"
                  rows={3}
                  style={{
                    width:"100%", padding:"8px 10px", borderRadius:"10px", resize:"none",
                    background:"rgba(255,255,255,0.04)", border:"1.5px solid rgba(99,102,241,0.4)",
                    color:"#e2e8f0", fontSize:"12px", lineHeight:"1.55", outline:"none",
                    boxSizing:"border-box", userSelect:"text",
                  }}
                />
                <div style={{ display:"flex", gap:"6px", marginTop:"6px" }}>
                  <button onClick={submitNote} style={{...okBtnStyle, flex:1, justifyContent:"center"}}>Simpan Catatan</button>
                  <button onClick={()=>{setAddingNote(false);setNewNoteText("");}} style={cancelBtnStyle}>✕</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>setAddingNote(true)} style={{
                marginTop:"4px", padding:"7px 10px",
                borderRadius:"9px", border:"1.5px dashed rgba(99,102,241,0.3)",
                background:"transparent", color:"#4b5563", fontSize:"12px", fontWeight:500,
                cursor:"pointer", width:"100%", textAlign:"left",
                display:"flex", alignItems:"center", gap:"6px",
                transition:"all 0.2s",
              }}>
                <span style={{ fontSize:"16px", color:"rgba(99,102,241,0.6)" }}>+</span> Tambah Catatan
              </button>
            )}
          </div>
        )}

        {/* ── MOTIVASI TAB ──────────────────────────────── */}
        {activeTab === "motivasi" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"8px", paddingTop:"4px" }}>
            {/* Edit / Add form */}
            {(addingMotiv || editingMotiv) && (
              <div style={{
                padding:"12px", borderRadius:"12px",
                background:"rgba(99,102,241,0.08)", border:"1.5px solid rgba(99,102,241,0.3)",
              }}>
                <p style={{ margin:"0 0 8px", fontSize:"11px", fontWeight:700, color:"#818cf8", letterSpacing:"0.05em" }}>
                  {editingMotiv ? "✏️ Edit Motivasi" : "✨ Tambah Motivasi"}
                </p>
                <textarea
                  ref={motivTextRef}
                  value={newMotivText}
                  onChange={e=>setNewMotivText(e.target.value)}
                  placeholder="Tulis kata motivasi..."
                  rows={3}
                  style={{
                    width:"100%", padding:"8px 10px", borderRadius:"8px", resize:"none",
                    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                    color:"#e2e8f0", fontSize:"12px", lineHeight:"1.6", outline:"none",
                    boxSizing:"border-box", userSelect:"text", marginBottom:"6px",
                  }}
                />
                <input
                  value={newMotivAuthor}
                  onChange={e=>setNewMotivAuthor(e.target.value)}
                  placeholder="Nama penulis (opsional)"
                  style={{
                    width:"100%", padding:"7px 10px", borderRadius:"8px",
                    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                    color:"#94a3b8", fontSize:"11px", outline:"none",
                    boxSizing:"border-box", userSelect:"text", marginBottom:"8px",
                  }}
                />
                <div style={{ display:"flex", gap:"6px" }}>
                  <button onClick={submitMotivation} style={{...okBtnStyle, flex:1, justifyContent:"center", fontSize:"11px"}}>
                    {editingMotiv ? "Perbarui" : "Simpan"}
                  </button>
                  <button onClick={cancelMotivForm} style={cancelBtnStyle}>Batal</button>
                </div>
              </div>
            )}

            {motivations.length === 0 && !addingMotiv && (
              <EmptyState icon="✨" title="Belum ada motivasi" sub='Tambahkan kata motivasi favoritmu' />
            )}

            {motivations.map((m, i) => {
              const acc = QUOTE_ACCENTS[i % QUOTE_ACCENTS.length];
              return (
                <div key={m.id} style={{
                  padding:"11px 13px", borderRadius:"11px",
                  background:`rgba(${hexToRgb(acc)},0.05)`,
                  border:`1px solid rgba(${hexToRgb(acc)},0.15)`,
                  position:"relative",
                }}>
                  <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"3px", background:`linear-gradient(180deg,${acc},transparent)`, borderRadius:"3px 0 0 3px" }}/>
                  <p style={{ margin:0, fontSize:"12px", color:"#e2e8f0", lineHeight:"1.6", fontStyle:"italic" }}>"{m.text}"</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"5px" }}>
                    <p style={{ margin:0, fontSize:"10px", color:acc, fontWeight:700 }}>— {m.author}</p>
                    <div style={{ display:"flex", gap:"4px" }}>
                      <button onClick={()=>startEditMotiv(m)} style={{
                        padding:"2px 7px", borderRadius:"5px", fontSize:"10px", cursor:"pointer",
                        border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.06)",
                        color:"#94a3b8",
                      }}>edit</button>
                      <button onClick={()=>deleteMotiv(m.id)} style={{
                        padding:"2px 7px", borderRadius:"5px", fontSize:"10px", cursor:"pointer",
                        border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.1)",
                        color:"#f87171",
                      }}>hapus</button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add motivation button */}
            {!addingMotiv && !editingMotiv && (
              <button onClick={()=>setAddingMotiv(true)} style={{
                padding:"8px 10px",
                borderRadius:"9px", border:"1.5px dashed rgba(99,102,241,0.3)",
                background:"transparent", color:"#4b5563", fontSize:"12px", fontWeight:500,
                cursor:"pointer", width:"100%", textAlign:"left",
                display:"flex", alignItems:"center", gap:"6px",
              }}>
                <span style={{ fontSize:"16px", color:"rgba(99,102,241,0.6)" }}>+</span> Tambah Motivasi
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══ FOOTER ══════════════════════════════════════════ */}
      <div onMouseDown={handleDrag} style={{
        padding:"7px 16px", flexShrink:0, cursor:"grab",
        borderTop:"1px solid rgba(255,255,255,0.05)",
        background:"rgba(0,0,0,0.25)",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <span style={{ fontSize:"9px", color:"#1e293b", letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>
          Alt+Space · Capture
        </span>
        <span style={{
          fontSize:"9px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
          color: isPinned ? "#fbbf24" : focusMode ? "#818cf8" : "#1f2937",
          transition:"color 0.3s",
        }}>
          {isPinned ? "📌 PINNED" : focusMode ? "⚡ FOCUS" : "✦ AETHER"}
        </span>
      </div>
    </div>
  );
}

// ══ SHARED BUTTON STYLES ══════════════════════════════════════
const okBtnStyle: React.CSSProperties = {
  padding:"6px 10px", borderRadius:"7px", fontSize:"12px", fontWeight:600,
  cursor:"pointer", border:"none", background:"rgba(99,102,241,0.35)",
  color:"#c7d2fe", display:"flex", alignItems:"center", gap:"4px",
};
const cancelBtnStyle: React.CSSProperties = {
  padding:"6px 10px", borderRadius:"7px", fontSize:"12px",
  cursor:"pointer", border:"1px solid rgba(255,255,255,0.08)",
  background:"rgba(255,255,255,0.04)", color:"#4b5563",
};

// ══ SUB-COMPONENTS ════════════════════════════════════════════
function IBtn({ children, onClick, active, activeColor, activeBorder, activeText, title }:
  { children: React.ReactNode; onClick:()=>void; active:boolean; activeColor:string; activeBorder:string; activeText:string; title?:string }) {
  return (
    <button onClick={onClick} onMouseDown={e=>e.stopPropagation()} title={title} style={{
      width:"30px", height:"30px", borderRadius:"8px", fontSize:"14px", cursor:"pointer",
      border: active ? `1px solid ${activeBorder}` : "1px solid rgba(255,255,255,0.1)",
      background: active ? activeColor : "rgba(255,255,255,0.04)",
      color: active ? activeText : "#4b5563",
      display:"flex", alignItems:"center", justifyContent:"center",
      transition:"all 0.2s",
    }}>{children}</button>
  );
}

function SLabel({ text }: { text: string }) {
  return <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#2d3748", padding:"7px 2px 4px" }}>{text}</div>;
}

function TaskRow({ task, onToggle, onDelete }: { task:{id:number;text:string;completed:boolean}; onToggle:(id:number)=>void; onDelete:(id:number)=>void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{
        display:"flex", alignItems:"flex-start", gap:"9px",
        padding:"7px 8px", marginBottom:"3px", borderRadius:"9px",
        background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border:`1px solid ${hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
        transition:"all 0.15s", position:"relative",
      }}
    >
      {/* Checkbox */}
      <div onClick={()=>onToggle(task.id)} style={{
        width:"16px", height:"16px", minWidth:"16px", borderRadius:"5px", marginTop:"2px",
        border: task.completed ? "2px solid #6366f1" : "2px solid rgba(255,255,255,0.18)",
        background: task.completed ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
        transition:"all 0.2s", flexShrink:0,
      }}>
        {task.completed && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      {/* Text */}
      <span onClick={()=>onToggle(task.id)} style={{
        fontSize:"13px", flex:1, lineHeight:"1.45", cursor:"pointer",
        color: task.completed ? "#2d3748" : "#e2e8f0",
        textDecoration: task.completed ? "line-through" : "none",
        wordBreak:"break-word", transition:"color 0.2s",
      }}>{task.text}</span>
      {/* Delete */}
      {hovered && (
        <button onClick={e=>{e.stopPropagation();onDelete(task.id);}} style={{
          position:"absolute", right:"6px", top:"50%", transform:"translateY(-50%)",
          width:"18px", height:"18px", borderRadius:"5px", border:"none",
          background:"rgba(239,68,68,0.2)", color:"#f87171", fontSize:"11px",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>✕</button>
      )}
    </div>
  );
}

function NoteCard({ note, accent, onDelete }: { note:{id:number;text:string}; accent:string; onDelete:(id:number)=>void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} style={{
      padding:"10px 12px", borderRadius:"10px", position:"relative",
      background:"rgba(255,255,255,0.025)",
      border:`1px solid ${hovered ? `rgba(${hexToRgb(accent)},0.25)` : "rgba(255,255,255,0.07)"}`,
      transition:"border 0.2s",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg,${accent},transparent)` }}/>
      <p style={{ margin:0, fontSize:"13px", color:"#d1d9e6", lineHeight:"1.55", wordBreak:"break-word" }}>{note.text}</p>
      {hovered && (
        <button onClick={()=>onDelete(note.id)} style={{
          position:"absolute", right:"7px", top:"7px", width:"18px", height:"18px",
          borderRadius:"5px", border:"none", background:"rgba(239,68,68,0.2)",
          color:"#f87171", fontSize:"11px", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>✕</button>
      )}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon:string; title:string; sub:string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"28px 20px", gap:"6px" }}>
      <span style={{ fontSize:"28px" }}>{icon}</span>
      <span style={{ fontSize:"13px", fontWeight:600, color:"#374151", marginTop:"4px" }}>{title}</span>
      <span style={{ fontSize:"11px", color:"#1e293b", textAlign:"center", lineHeight:1.5 }}>{sub}</span>
    </div>
  );
}
