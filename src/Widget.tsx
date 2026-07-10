import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

// ── Types ────────────────────────────────────────────────────
interface Task      { id: number; text: string; cap_type: string; completed: boolean; }
interface WidgetData{ date: string; tasks: Task[]; last_note: string|null; focus_mode: boolean; }
interface Motivation{ id: number; text: string; author: string; }

// ── Design tokens ────────────────────────────────────────────
const C = {
  bg:          "#0f1621",           // deep navy
  bgSurf:      "rgba(255,255,255,0.028)",
  bgSurf2:     "rgba(255,255,255,0.055)",
  border:      "rgba(255,255,255,0.07)",
  borderAcc:   "rgba(99,102,241,0.35)",
  textPrimary: "#e8edf5",
  textSec:     "#8b99b5",
  textMuted:   "#3d4f6b",
  accent:      "#6366f1",
  accentLight: "#a5b4fc",
  accentGlow:  "rgba(99,102,241,0.18)",
  success:     "#4ade80",
  warning:     "#fbbf24",
  danger:      "#f87171",
};

const NOTE_ACCENTS  = ["#818cf8","#34d399","#fbbf24","#38bdf8","#e879f9","#fb923c","#a3e635","#f472b6"];
const QUOTE_ACCENTS = ["#818cf8","#34d399","#fbbf24","#a78bfa","#38bdf8","#4ade80","#e879f9","#facc15","#fb923c","#f472b6","#67e8f9","#86efac","#fca5a5","#c4b5fd","#6ee7b7"];
const rgb = (h:string) => { const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return `${r},${g},${b}`; };

const appWindow = getCurrentWindow();

// ═════════════════════════════════════════════════════════════
//  WIDGET
// ═════════════════════════════════════════════════════════════
export default function Widget() {
  const [data,       setData]      = useState<WidgetData|null>(null);
  const [captures,   setCaptures]  = useState<Task[]>([]);
  const [motivations,setMotivs]    = useState<Motivation[]>([]);
  const [tab,        setTab]       = useState<"tasks"|"notes"|"motivasi">("tasks");
  const [focusMode,  setFocus]     = useState(false);
  const [isPinned,   setPin]       = useState(false);
  const [quoteIdx,   setQuoteIdx]  = useState(0);
  const [quoteVis,   setQuoteVis]  = useState(true);
  const [clock,      setClock]     = useState(new Date());

  // inline add
  const [addTask,    setAddTask]   = useState(false);
  const [taskText,   setTaskText]  = useState("");
  const [addNote,    setAddNote]   = useState(false);
  const [noteText,   setNoteText]  = useState("");

  // motivation form
  const [addMotiv,   setAddMotiv]  = useState(false);
  const [editMotiv,  setEditMotiv] = useState<Motivation|null>(null);
  const [motivTxt,   setMotivTxt]  = useState("");
  const [motivAuth,  setMotivAuth] = useState("");

  const taskRef  = useRef<HTMLInputElement>(null);
  const noteRef  = useRef<HTMLTextAreaElement>(null);
  const motivRef = useRef<HTMLTextAreaElement>(null);

  // ── Live clock ──────────────────────────────────────────────
  useEffect(() => { const t=setInterval(()=>setClock(new Date()),1000); return()=>clearInterval(t); }, []);

  // ── Quote rotation ──────────────────────────────────────────
  useEffect(() => {
    if (!motivations.length) return;
    const t = setInterval(() => {
      setQuoteVis(false);
      setTimeout(() => { setQuoteIdx(i=>(i+1)%motivations.length); setQuoteVis(true); }, 500);
    }, 15000);
    return () => clearInterval(t);
  }, [motivations.length]);

  // ── Data ────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const wd = await invoke<WidgetData>("get_widget_data");
      setData(wd); setFocus(wd.focus_mode);
      const caps = await invoke<Task[]>("search_captures", { query:"" });
      setCaptures(caps);
    } catch {}
  };
  const fetchMotivs = async () => {
    try { const ms = await invoke<Motivation[]>("get_motivations"); setMotivs(ms); } catch {}
  };

  useEffect(() => {
    fetchData(); fetchMotivs();
    const iv = setInterval(fetchData, 4000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { if (addTask) taskRef.current?.focus(); }, [addTask]);
  useEffect(() => { if (addNote) noteRef.current?.focus(); }, [addNote]);
  useEffect(() => { if (addMotiv||editMotiv) motivRef.current?.focus(); }, [addMotiv, editMotiv]);

  // ── Handlers ────────────────────────────────────────────────
  const drag        = async (e:React.MouseEvent) => { e.preventDefault(); try{await appWindow.startDragging();}catch{} };
  const handlePin   = async () => {
    const next = !isPinned; setPin(next);
    try { await invoke("set_widget_pin", { pinned: next }); } catch(e) { console.error("Pin failed:", e); }
  };
  const handleFocus = async () => { try{ const a=await invoke<boolean>("toggle_focus_mode"); setFocus(a); await fetchData(); }catch{} };
  const toggleTask  = async (id:number) => { try{ await invoke("toggle_task_completion",{id}); await fetchData(); }catch{} };
  const delCapture  = async (id:number) => { try{ await invoke("delete_capture",{id}); await fetchData(); }catch{} };

  const submitTask  = async () => {
    if (!taskText.trim()) { setAddTask(false); return; }
    try { await invoke("save_widget_capture",{text:taskText.trim(),capType:"task"}); setTaskText(""); setAddTask(false); await fetchData(); } catch {}
  };
  const submitNote  = async () => {
    if (!noteText.trim()) { setAddNote(false); return; }
    try { await invoke("save_widget_capture",{text:noteText.trim(),capType:"note"}); setNoteText(""); setAddNote(false); await fetchData(); } catch {}
  };

  const submitMotiv = async () => {
    if (!motivTxt.trim()) return;
    const author = motivAuth.trim() || "Anonim";
    try {
      if (editMotiv) await invoke("update_motivation",{id:editMotiv.id,text:motivTxt.trim(),author});
      else           await invoke("add_motivation",{text:motivTxt.trim(),author});
      setMotivTxt(""); setMotivAuth(""); setAddMotiv(false); setEditMotiv(null);
      await fetchMotivs();
    } catch {}
  };
  const startEdit = (m:Motivation) => { setEditMotiv(m); setMotivTxt(m.text); setMotivAuth(m.author); setAddMotiv(false); };
  const cancelForm = () => { setEditMotiv(null); setAddMotiv(false); setMotivTxt(""); setMotivAuth(""); };
  const delMotiv  = async (id:number) => { try{ await invoke("delete_motivation",{id}); await fetchMotivs(); }catch{} };
  const nextQuote = () => {
    if (!motivations.length) return;
    setQuoteVis(false);
    setTimeout(() => { setQuoteIdx(i=>(i+1)%motivations.length); setQuoteVis(true); }, 300);
  };

  // ── Computed ────────────────────────────────────────────────
  const tasks   = data?.tasks || [];
  const notes   = captures.filter(c=>c.cap_type==="note");
  const pending = tasks.filter(t=>!t.completed);
  const done    = tasks.filter(t=>t.completed);
  const pct     = tasks.length ? (done.length/tasks.length)*100 : 0;

  const quote      = motivations[quoteIdx % Math.max(motivations.length,1)];
  const quoteAcc   = QUOTE_ACCENTS[quoteIdx % QUOTE_ACCENTS.length];
  const hh         = clock.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",hour12:false});
  const ss         = String(clock.getSeconds()).padStart(2,"0");
  const dayName    = data?.date?.split(",")[0]?.trim()||"";
  const dateRest   = data?.date?.split(",").slice(1).join(",").trim()||"";

  const borderCol  = focusMode  ? `rgba(${rgb(C.accent)},0.5)`
                    : isPinned  ? `rgba(${rgb(C.warning)},0.4)`
                    :             C.border;
  const outerGlow  = focusMode  ? `0 0 40px rgba(${rgb(C.accent)},0.12)`
                    : isPinned  ? `0 0 40px rgba(${rgb(C.warning)},0.08)`
                    :             "none";

  return (
    <div style={{
      width:"100%", height:"100%",
      display:"flex", flexDirection:"column",
      borderRadius:"22px", overflow:"hidden",
      background:`linear-gradient(165deg, #0f1823 0%, #0a1018 100%)`,
      border:`1.5px solid ${borderCol}`,
      boxShadow:`0 24px 80px rgba(0,0,0,0.65), 0 4px 24px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.045), ${outerGlow}`,
      fontFamily:"'Segoe UI Variable','Segoe UI',-apple-system,sans-serif",
      userSelect:"none",
      transition:"border 0.35s ease, box-shadow 0.35s ease",
    }}>

      {/* ══ HEADER ════════════════════════════════════════ */}
      <div onMouseDown={drag} style={{
        padding:"16px 18px 13px", flexShrink:0, cursor:"grab",
        background:"rgba(255,255,255,0.018)",
        borderBottom:`1px solid ${C.border}`,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>

          {/* Clock + date */}
          <div>
            <div style={{ display:"flex", alignItems:"baseline", gap:"4px" }}>
              <span style={{ fontSize:"34px", fontWeight:700, letterSpacing:"-1.5px", color:C.textPrimary, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>
                {hh}
              </span>
              <span style={{ fontSize:"14px", color:C.textMuted, fontWeight:400, letterSpacing:0 }}>:{ss}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"6px", marginTop:"3px" }}>
              <span style={{ fontSize:"13px", fontWeight:600, color:C.textPrimary }}>{dayName}</span>
              <span style={{ fontSize:"11px", color:C.textSec, fontWeight:400 }}>{dateRest}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:"flex", gap:"7px", alignItems:"center" }} onMouseDown={e=>e.stopPropagation()}>
            <PinBtn pinned={isPinned} onClick={handlePin} />
            <FocusBtn active={focusMode} onClick={handleFocus} />
            <AddBtn onClick={async()=>{ try{await invoke("show_palette");}catch{} }} />
          </div>
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div style={{ marginTop:"13px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
              <span style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.textMuted }}>
                PROGRESS HARI INI
              </span>
              <span style={{ fontSize:"10px", fontWeight:700, color: pct===100 ? C.success : C.textSec, transition:"color 0.4s" }}>
                {done.length} / {tasks.length} &nbsp;·&nbsp; {Math.round(pct)}%
              </span>
            </div>
            <div style={{ height:"4px", borderRadius:"99px", background:"rgba(255,255,255,0.05)", overflow:"hidden" }}>
              <div style={{
                height:"100%", width:`${pct}%`, borderRadius:"99px", transition:"width 0.7s cubic-bezier(0.4,0,0.2,1)",
                background: pct===100
                  ? `linear-gradient(90deg,${C.success},#22d3ee)`
                  : `linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)`,
                boxShadow: pct>0 ? `0 0 8px rgba(${rgb(C.accent)},0.4)` : "none",
              }}/>
            </div>
          </div>
        )}
      </div>

      {/* ══ QUOTE STRIP ════════════════════════════════════ */}
      {quote && (
        <div onClick={nextQuote} onMouseDown={e=>e.stopPropagation()} style={{
          padding:"12px 18px 11px", flexShrink:0, cursor:"pointer",
          background:`linear-gradient(135deg, rgba(${rgb(quoteAcc)},0.07) 0%, rgba(${rgb(quoteAcc)},0.02) 100%)`,
          borderBottom:`1px solid rgba(${rgb(quoteAcc)},0.13)`,
          opacity: quoteVis ? 1 : 0, transition:"opacity 0.5s ease",
          position:"relative", overflow:"hidden",
        }}>
          {/* Decorative opening quote */}
          <div style={{
            position:"absolute", top:"2px", left:"13px",
            fontSize:"36px", lineHeight:1,
            color:`rgba(${rgb(quoteAcc)},0.18)`,
            fontFamily:"Georgia,'Times New Roman',serif",
            pointerEvents:"none",
          }}>"</div>

          <p style={{ margin:0, fontSize:"12px", lineHeight:"1.7", color:"#c5d0e4", paddingLeft:"20px", paddingRight:"20px", fontStyle:"italic", letterSpacing:"0.01em" }}>
            {quote.text}
          </p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingLeft:"20px", marginTop:"6px" }}>
            <span style={{ fontSize:"10px", color:quoteAcc, fontWeight:700, letterSpacing:"0.04em" }}>— {quote.author}</span>
            <span style={{ fontSize:"9px", color:"rgba(255,255,255,0.11)" }}>tap ›</span>
          </div>
        </div>
      )}

      {/* ══ TAB BAR ════════════════════════════════════════ */}
      <div style={{
        display:"flex", padding:"8px 12px 7px", gap:"5px", flexShrink:0,
        background:"rgba(0,0,0,0.18)",
      }} onMouseDown={e=>e.stopPropagation()}>
        {(["tasks","notes","motivasi"] as const).map(t => {
          const cnt   = t==="tasks" ? pending.length : t==="notes" ? notes.length : motivations.length;
          const icon  = {tasks:"📋",notes:"📝",motivasi:"✨"}[t];
          const label = {tasks:"Tugas",notes:"Catatan",motivasi:"Motivasi"}[t];
          const isAct = tab === t;
          return (
            <button key={t} onClick={()=>setTab(t)} style={{
              flex:1, padding:"6px 2px 5px", borderRadius:"10px", cursor:"pointer",
              border: isAct ? `1px solid rgba(${rgb(C.accent)},0.4)` : "1px solid transparent",
              background: isAct ? `linear-gradient(135deg, rgba(${rgb(C.accent)},0.22), rgba(${rgb(C.accent)},0.12))` : "transparent",
              color: isAct ? C.accentLight : C.textMuted,
              fontSize:"10.5px", fontWeight: isAct ? 700 : 500,
              display:"flex", flexDirection:"column", alignItems:"center", gap:"2px",
              transition:"all 0.2s",
              boxShadow: isAct ? `inset 0 1px 0 rgba(255,255,255,0.06)` : "none",
            }}>
              <span style={{ fontSize:"14px", lineHeight:1 }}>{icon}</span>
              <span style={{ letterSpacing:"0.02em" }}>{label}{cnt>0 ? ` (${cnt})` : ""}</span>
            </button>
          );
        })}
      </div>

      {/* ══ CONTENT ════════════════════════════════════════ */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 14px 6px", scrollbarWidth:"none" }} onMouseDown={e=>e.stopPropagation()}>

        {/* ── TASKS ─────────────────────────────────────── */}
        {tab==="tasks" && (
          <div>
            {tasks.length===0 && !addTask && <EmptyState icon="✅" title="Tidak ada tugas" sub='Ketuk "+ Tambah Tugas" untuk mulai' />}

            {pending.length>0 && <SLabel text={`Belum Selesai  ·  ${pending.length}`} />}
            {pending.map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onDel={delCapture}/>)}

            {done.length>0 && <SLabel text={`Selesai ✓  ·  ${done.length}`} />}
            {done.map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onDel={delCapture}/>)}

            {addTask ? (
              <div style={{ display:"flex", gap:"6px", marginTop:"10px", alignItems:"center" }}>
                <input ref={taskRef} value={taskText} onChange={e=>setTaskText(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter")submitTask(); if(e.key==="Escape"){setAddTask(false);setTaskText("");} }}
                  placeholder="Nama tugas baru…"
                  style={inStyle} />
                <button onClick={submitTask}   style={okBtn}>✓</button>
                <button onClick={()=>{setAddTask(false);setTaskText("");}} style={xBtn}>✕</button>
              </div>
            ) : (
              <AddRowBtn label="Tambah Tugas" onClick={()=>setAddTask(true)} />
            )}
          </div>
        )}

        {/* ── NOTES ─────────────────────────────────────── */}
        {tab==="notes" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"7px", paddingTop:"4px" }}>
            {notes.length===0 && !addNote && <EmptyState icon="📝" title="Belum ada catatan" sub='Ketuk "+ Tambah Catatan" untuk menulis' />}

            {notes.map((n,i)=><NoteCard key={n.id} note={n} accent={NOTE_ACCENTS[i%NOTE_ACCENTS.length]} onDel={delCapture}/>)}

            {addNote ? (
              <div style={{ marginTop:"4px" }}>
                <textarea ref={noteRef} value={noteText} onChange={e=>setNoteText(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"&&e.ctrlKey)submitNote(); if(e.key==="Escape"){setAddNote(false);setNoteText("");} }}
                  placeholder="Tulis catatan kamu… (Ctrl+Enter simpan)"
                  rows={3} style={{ ...taStyle }} />
                <div style={{ display:"flex", gap:"6px", marginTop:"6px" }}>
                  <button onClick={submitNote} style={{...okBtn,flex:1,justifyContent:"center"}}>Simpan Catatan</button>
                  <button onClick={()=>{setAddNote(false);setNoteText("");}} style={xBtn}>✕</button>
                </div>
              </div>
            ) : (
              <AddRowBtn label="Tambah Catatan" onClick={()=>setAddNote(true)} />
            )}
          </div>
        )}

        {/* ── MOTIVASI ──────────────────────────────────── */}
        {tab==="motivasi" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"8px", paddingTop:"4px" }}>
            {/* Form */}
            {(addMotiv || editMotiv) && (
              <div style={{ padding:"13px 14px", borderRadius:"14px", background:`rgba(${rgb(C.accent)},0.07)`, border:`1.5px solid rgba(${rgb(C.accent)},0.3)` }}>
                <span style={{ fontSize:"11px", fontWeight:700, color:C.accentLight, letterSpacing:"0.06em", display:"block", marginBottom:"9px" }}>
                  {editMotiv ? "✏️  Edit Motivasi" : "✨  Tambah Motivasi"}
                </span>
                <textarea ref={motivRef} value={motivTxt} onChange={e=>setMotivTxt(e.target.value)}
                  placeholder="Tulis kata motivasi…" rows={3} style={{ ...taStyle, marginBottom:"7px" }} />
                <input value={motivAuth} onChange={e=>setMotivAuth(e.target.value)}
                  placeholder="Nama penulis (opsional)"
                  style={{ ...inStyle, fontSize:"11px", color:C.textSec, marginBottom:"9px" }} />
                <div style={{ display:"flex", gap:"7px" }}>
                  <button onClick={submitMotiv} style={{...okBtn,flex:1,justifyContent:"center",padding:"7px 0"}}>
                    {editMotiv ? "Perbarui" : "Simpan"}
                  </button>
                  <button onClick={cancelForm} style={xBtn}>Batal</button>
                </div>
              </div>
            )}

            {motivations.length===0 && !addMotiv && <EmptyState icon="✨" title="Belum ada motivasi" sub="Tambahkan kata-kata yang menginspirasimu" />}

            {motivations.map((m,i) => {
              const acc = QUOTE_ACCENTS[i%QUOTE_ACCENTS.length];
              return (
                <div key={m.id} style={{
                  padding:"11px 13px", borderRadius:"12px", position:"relative",
                  background:`rgba(${rgb(acc)},0.05)`,
                  border:`1px solid rgba(${rgb(acc)},0.14)`,
                }}>
                  <div style={{ position:"absolute",left:0,top:0,bottom:0,width:"3px",background:`linear-gradient(180deg,${acc},transparent)`,borderRadius:"3px 0 0 3px" }}/>
                  <p style={{ margin:0, fontSize:"12px", color:C.textPrimary, lineHeight:"1.65", fontStyle:"italic" }}>"{m.text}"</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"7px" }}>
                    <span style={{ fontSize:"10px", color:acc, fontWeight:700 }}>— {m.author}</span>
                    <div style={{ display:"flex", gap:"5px" }}>
                      <Chip label="edit"  onClick={()=>startEdit(m)} color="rgba(255,255,255,0.08)" textColor={C.textSec} />
                      <Chip label="hapus" onClick={()=>delMotiv(m.id)} color="rgba(239,68,68,0.1)" textColor={C.danger} border="rgba(239,68,68,0.25)" />
                    </div>
                  </div>
                </div>
              );
            })}

            {!addMotiv && !editMotiv && <AddRowBtn label="Tambah Motivasi" onClick={()=>setAddMotiv(true)} />}
          </div>
        )}
      </div>

      {/* ══ FOOTER ═════════════════════════════════════════ */}
      <div onMouseDown={drag} style={{
        padding:"7px 18px", flexShrink:0, cursor:"grab",
        borderTop:`1px solid ${C.border}`,
        background:"rgba(0,0,0,0.28)",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <span style={{ fontSize:"9px", color:C.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:600 }}>
          Alt+Space · Capture
        </span>
        <span style={{
          fontSize:"9px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
          color: isPinned ? C.warning : focusMode ? C.accentLight : C.textMuted,
          transition:"color 0.35s",
        }}>
          {isPinned ? "📌 PINNED" : focusMode ? "⚡ FOCUS" : "✦ AETHER"}
        </span>
      </div>
    </div>
  );
}

// ══ SHARED STYLES ════════════════════════════════════════════
const inStyle: React.CSSProperties = {
  flex:1, padding:"8px 11px", borderRadius:"9px",
  background:"rgba(255,255,255,0.04)", border:"1.5px solid rgba(99,102,241,0.35)",
  color:"#e8edf5", fontSize:"12.5px", outline:"none", userSelect:"text",
  width:"100%", boxSizing:"border-box",
};
const taStyle: React.CSSProperties = {
  ...inStyle, resize:"none", lineHeight:"1.6", width:"100%", display:"block",
};
const okBtn: React.CSSProperties = {
  padding:"7px 11px", borderRadius:"8px", fontSize:"12px", fontWeight:700,
  cursor:"pointer", border:"none", background:"rgba(99,102,241,0.3)",
  color:"#c7d2fe", display:"flex", alignItems:"center", gap:"4px", flexShrink:0,
};
const xBtn: React.CSSProperties = {
  padding:"7px 10px", borderRadius:"8px", fontSize:"12px",
  cursor:"pointer", border:"1px solid rgba(255,255,255,0.07)",
  background:"rgba(255,255,255,0.04)", color:"#4b5563", flexShrink:0,
};

// ══ SMALL COMPONENTS ════════════════════════════════════════
function PinBtn({ pinned, onClick }: { pinned:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} onMouseDown={e=>e.stopPropagation()} title={pinned?"Lepas pin":"Pin di atas semua jendela"}
      style={{
        width:"32px", height:"32px", borderRadius:"9px", fontSize:"15px", cursor:"pointer",
        border: pinned ? "1px solid rgba(251,191,36,0.45)" : "1px solid rgba(255,255,255,0.1)",
        background: pinned ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.04)",
        color: pinned ? "#fbbf24" : "#4b5563",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all 0.25s",
        boxShadow: pinned ? "0 0 12px rgba(251,191,36,0.2)" : "none",
      }}>📌</button>
  );
}

function FocusBtn({ active, onClick }: { active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} onMouseDown={e=>e.stopPropagation()}
      style={{
        padding:"5px 12px", borderRadius:"9px", fontSize:"11px", fontWeight:700, cursor:"pointer",
        border: active ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.1)",
        background: active ? "rgba(99,102,241,0.22)" : "rgba(255,255,255,0.04)",
        color: active ? "#a5b4fc" : "#4b5563",
        transition:"all 0.25s", letterSpacing:"0.03em",
        boxShadow: active ? "0 0 14px rgba(99,102,241,0.18)" : "none",
      }}>
      {active ? "⚡ Focus" : "Focus"}
    </button>
  );
}

function AddBtn({ onClick }: { onClick:()=>void }) {
  return (
    <button onClick={onClick} onMouseDown={e=>e.stopPropagation()} title="Buka capture palette (Alt+Space)"
      style={{
        width:"32px", height:"32px", borderRadius:"9px", fontSize:"20px", fontWeight:300,
        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        border:"1px solid rgba(99,102,241,0.4)", background:"rgba(99,102,241,0.14)",
        color:"#a5b4fc", transition:"all 0.2s",
        boxShadow:"0 0 10px rgba(99,102,241,0.1)",
      }}>+</button>
  );
}

function SLabel({ text }: { text:string }) {
  return (
    <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#2d3748", padding:"8px 2px 5px" }}>
      {text}
    </div>
  );
}

function AddRowBtn({ label, onClick }: { label:string; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{
      marginTop:"8px", padding:"8px 12px",
      borderRadius:"10px", border:"1.5px dashed rgba(99,102,241,0.28)",
      background:"transparent", color:"#3d4f6b", fontSize:"12px", fontWeight:500,
      cursor:"pointer", width:"100%", textAlign:"left",
      display:"flex", alignItems:"center", gap:"7px",
      transition:"all 0.2s", letterSpacing:"0.01em",
    }}>
      <span style={{ fontSize:"16px", color:"rgba(99,102,241,0.55)", lineHeight:1 }}>+</span>
      {label}
    </button>
  );
}

function Chip({ label, onClick, color, textColor, border }:
  { label:string; onClick:()=>void; color:string; textColor:string; border?:string }) {
  return (
    <button onClick={onClick} style={{
      padding:"2px 8px", borderRadius:"5px", fontSize:"10px", cursor:"pointer",
      border: border ? `1px solid ${border}` : "1px solid rgba(255,255,255,0.08)",
      background:color, color:textColor, transition:"all 0.15s",
    }}>{label}</button>
  );
}

function TaskRow({ task, onToggle, onDel }:
  { task:{id:number;text:string;completed:boolean}; onToggle:(id:number)=>void; onDel:(id:number)=>void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      display:"flex", alignItems:"flex-start", gap:"10px",
      padding:"8px 9px", marginBottom:"3px", borderRadius:"10px", position:"relative",
      background: hov ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
      border:`1px solid ${hov ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)"}`,
      transition:"all 0.15s",
    }}>
      {/* Checkbox */}
      <div onClick={()=>onToggle(task.id)} style={{
        width:"17px", height:"17px", minWidth:"17px", borderRadius:"5px", marginTop:"2px",
        border: task.completed ? "2px solid #6366f1" : "2px solid rgba(255,255,255,0.18)",
        background: task.completed ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor:"pointer", flexShrink:0, transition:"all 0.22s",
        boxShadow: task.completed ? "0 0 8px rgba(99,102,241,0.35)" : "none",
      }}>
        {task.completed && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      {/* Text */}
      <span onClick={()=>onToggle(task.id)} style={{
        fontSize:"13px", flex:1, lineHeight:"1.5", cursor:"pointer", wordBreak:"break-word",
        color: task.completed ? "#2d3748" : "#d8e3f0",
        textDecoration: task.completed ? "line-through" : "none",
        transition:"color 0.2s, text-decoration 0.2s",
      }}>{task.text}</span>
      {/* Delete */}
      {hov && (
        <button onClick={e=>{e.stopPropagation();onDel(task.id);}} style={{
          position:"absolute", right:"6px", top:"50%", transform:"translateY(-50%)",
          width:"19px", height:"19px", borderRadius:"5px",
          border:"none", background:"rgba(239,68,68,0.18)", color:"#f87171",
          fontSize:"11px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0, transition:"all 0.15s",
        }}>✕</button>
      )}
    </div>
  );
}

function NoteCard({ note, accent, onDel }:
  { note:{id:number;text:string}; accent:string; onDel:(id:number)=>void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      padding:"11px 14px", borderRadius:"11px", position:"relative",
      background:"rgba(255,255,255,0.025)",
      border:`1px solid ${hov ? `rgba(${rgb(accent)},0.3)` : "rgba(255,255,255,0.07)"}`,
      transition:"border 0.2s",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"2.5px", background:`linear-gradient(90deg,${accent},transparent)`, borderRadius:"11px 11px 0 0" }}/>
      <p style={{ margin:0, fontSize:"13px", color:"#cdd8ec", lineHeight:"1.6", wordBreak:"break-word" }}>{note.text}</p>
      {hov && (
        <button onClick={()=>onDel(note.id)} style={{
          position:"absolute", right:"8px", top:"8px", width:"19px", height:"19px",
          borderRadius:"5px", border:"none", background:"rgba(239,68,68,0.18)",
          color:"#f87171", fontSize:"11px", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>✕</button>
      )}
    </div>
  );
}

function EmptyState({ icon,title,sub }: { icon:string; title:string; sub:string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"30px 20px 20px", gap:"7px" }}>
      <span style={{ fontSize:"30px" }}>{icon}</span>
      <span style={{ fontSize:"13.5px", fontWeight:600, color:"#3d4f6b", marginTop:"4px" }}>{title}</span>
      <span style={{ fontSize:"11px", color:"#2a3850", textAlign:"center", lineHeight:1.55 }}>{sub}</span>
    </div>
  );
}
