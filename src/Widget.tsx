import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

// ── Types ────────────────────────────────────────────────────
interface Task       { id: number; text: string; cap_type: string; completed: boolean; }
interface WidgetData { date: string; tasks: Task[]; last_note: string|null; focus_mode: boolean; }
interface Motivation { id: number; text: string; author: string; }
interface Habit      { id: number; text: string; streak: number; last_completed: string|null; }
interface UserStats  { xp: number; level: number; }
interface MoodEntry  { id: number; mood: string; date: string; }

// ── Design tokens & Themes ────────────────────────────────────
const THEMES = {
  navy: {
    bg: "linear-gradient(165deg, #070c14 0%, #03060a 100%)",
    bgSurf: "rgba(255,255,255,0.025)",
    bgSurf2: "rgba(255,255,255,0.055)",
    border: "rgba(255,255,255,0.06)",
    borderAcc: "rgba(99,102,241,0.3)",
    textPrimary: "#f1f5f9",
    textSec: "#94a3b8",
    textMuted: "#475569",
    accent: "#6366f1",
    accentLight: "#a5b4fc",
    accentGlow: "rgba(99,102,241,0.12)",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    name: "Calming Navy"
  },
  cyberpunk: {
    bg: "linear-gradient(165deg, #14051a 0%, #09020d 100%)",
    bgSurf: "rgba(255,255,255,0.03)",
    bgSurf2: "rgba(255,255,255,0.06)",
    border: "rgba(217,70,239,0.15)",
    borderAcc: "rgba(217,70,239,0.4)",
    textPrimary: "#fae8ff",
    textSec: "#e879f9",
    textMuted: "#701a75",
    accent: "#d946ef",
    accentLight: "#f472b6",
    accentGlow: "rgba(217,70,239,0.14)",
    success: "#10b981",
    warning: "#fbbf24",
    danger: "#ef4444",
    name: "Cyberpunk Pink"
  },
  forest: {
    bg: "linear-gradient(165deg, #04120c 0%, #010805 100%)",
    bgSurf: "rgba(255,255,255,0.02)",
    bgSurf2: "rgba(255,255,255,0.05)",
    border: "rgba(16,185,129,0.12)",
    borderAcc: "rgba(16,185,129,0.35)",
    textPrimary: "#ecfdf5",
    textSec: "#34d399",
    textMuted: "#065f46",
    accent: "#10b981",
    accentLight: "#34d399",
    accentGlow: "rgba(16,185,129,0.1)",
    success: "#34d399",
    warning: "#f59e0b",
    danger: "#f87171",
    name: "Emerald Forest"
  },
  amber: {
    bg: "linear-gradient(165deg, #180902 0%, #0c0401 100%)",
    bgSurf: "rgba(255,255,255,0.02)",
    bgSurf2: "rgba(255,255,255,0.055)",
    border: "rgba(245,158,11,0.15)",
    borderAcc: "rgba(245,158,11,0.4)",
    textPrimary: "#fef3c7",
    textSec: "#fbbf24",
    textMuted: "#78350f",
    accent: "#f59e0b",
    accentLight: "#fbbf24",
    accentGlow: "rgba(245,158,11,0.12)",
    success: "#10b981",
    warning: "#fbbf24",
    danger: "#f87171",
    name: "Warm Amber"
  },
  royal: {
    bg: "linear-gradient(165deg, #0e0517 0%, #06020a 100%)",
    bgSurf: "rgba(255,255,255,0.025)",
    bgSurf2: "rgba(255,255,255,0.05)",
    border: "rgba(168,85,247,0.15)",
    borderAcc: "rgba(168,85,247,0.4)",
    textPrimary: "#faf5ff",
    textSec: "#c084fc",
    textMuted: "#6b21a8",
    accent: "#a855f7",
    accentLight: "#d8b4fe",
    accentGlow: "rgba(168,85,247,0.14)",
    success: "#10b981",
    warning: "#fbbf24",
    danger: "#ef4444",
    name: "Royal Amethyst"
  },
  ocean: {
    bg: "linear-gradient(165deg, #021017 0%, #01060a 100%)",
    bgSurf: "rgba(255,255,255,0.02)",
    bgSurf2: "rgba(255,255,255,0.05)",
    border: "rgba(14,165,233,0.12)",
    borderAcc: "rgba(14,165,233,0.35)",
    textPrimary: "#f0f9ff",
    textSec: "#38bdf8",
    textMuted: "#0369a1",
    accent: "#0ea5e9",
    accentLight: "#7dd3fc",
    accentGlow: "rgba(14,165,233,0.12)",
    success: "#34d399",
    warning: "#f59e0b",
    danger: "#f87171",
    name: "Deep Ocean"
  },
  sunset: {
    bg: "linear-gradient(165deg, #1a0808 0%, #0a0202 100%)",
    bgSurf: "rgba(255,255,255,0.025)",
    bgSurf2: "rgba(255,255,255,0.05)",
    border: "rgba(244,63,94,0.15)",
    borderAcc: "rgba(244,63,94,0.4)",
    textPrimary: "#fff1f2",
    textSec: "#fb7185",
    textMuted: "#9f1239",
    accent: "#f43f5e",
    accentLight: "#fda4af",
    accentGlow: "rgba(244,63,94,0.14)",
    success: "#10b981",
    warning: "#fbbf24",
    danger: "#ef4444",
    name: "Sunset Horizon"
  }
};

const NOTE_ACCENTS  = ["#818cf8", "#34d399", "#fbbf24", "#38bdf8", "#e879f9", "#fb923c", "#a3e635", "#f472b6"];
const QUOTE_ACCENTS = ["#818cf8", "#34d399", "#fbbf24", "#a78bfa", "#38bdf8", "#4ade80", "#e879f9", "#facc15", "#fb923c", "#f472b6"];
const rgb = (h:string) => {
  const r = parseInt(h.slice(1,3), 16);
  const g = parseInt(h.slice(3,5), 16);
  const b = parseInt(h.slice(5,7), 16);
  return `${r},${g},${b}`;
};

const getTaskPriority = (text: string): "high" | "medium" | "low" => {
  const t = text.toLowerCase();
  const urgentKeywords = ["deadline", "urgent", "cepat", "sekarang", "now", "mendesak", "hari ini", "today", "asap", "!", "prioritas"];
  const importantKeywords = ["belajar", "learn", "study", "pr", "project", "kerja", "work", "tugas", "kuliah", "sekolah", "ibadah", "tuhan", "alkitab", "doa", "bible", "health", "sehat", "olahraga", "gym", "workout", "meditasi"];
  const isUrgent = urgentKeywords.some(kw => t.includes(kw));
  const isImportant = importantKeywords.some(kw => t.includes(kw));
  if (isUrgent) return "high";
  if (isImportant) return "medium";
  return "low";
};

const appWindow = getCurrentWindow();

// ── Level Titles ─────────────────────────────────────────────
const getLevelName = (level: number) => {
  if (level === 1) return "Pemula (Starter)";
  if (level === 2) return "Pencari Fokus (Focus Seeker)";
  if (level === 3) return "Pejuang Disiplin (Discipline Striver)";
  if (level === 4) return "Pengendali Diri (Self Controller)";
  if (level === 5) return "Achiever (Pemenang)";
  if (level === 6) return "Guru Fokus (Focus Guru)";
  if (level === 7) return "Tuan Kebiasaan (Habit Master)";
  if (level === 8) return "Legenda Produktivitas (Productivity Legend)";
  if (level === 9) return "Dewa Efisiensi (Efficiency God)";
  return "Versi Terbaik Diri (Best Version of Self) 👑";
};

// ── Synthesized Chime Engine (Web Audio API) ──────────────────
const playSound = (type: "complete" | "levelup" | "finish_pomodoro" | "click") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "complete") {
      // Satisfying dual tone (success checkmark)
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08); // G5
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.22);
    } else if (type === "levelup") {
      // Triumphant upward major arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        g.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
        o.start(ctx.currentTime + idx * 0.08);
        o.stop(ctx.currentTime + idx * 0.08 + 0.25);
      });
    } else if (type === "finish_pomodoro") {
      // Warm alert tone
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        g.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);
        o.start(ctx.currentTime + idx * 0.1);
        o.stop(ctx.currentTime + idx * 0.1 + 0.4);
      });
    } else {
      // Click feedback
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch (e) {
    console.error("Audio synth error:", e);
  }
};

// ═════════════════════════════════════════════════════════════
//  WIDGET
// ═════════════════════════════════════════════════════════════
export default function Widget() {
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>("navy");
  const C = THEMES[currentTheme] || THEMES.navy;

  const [data,        setData]        = useState<WidgetData|null>(null);
  const [captures,    setCaptures]    = useState<Task[]>([]);
  const [motivations, setMotivs]      = useState<Motivation[]>([]);
  const [habits,      setHabits]      = useState<Habit[]>([]);
  const [stats,       setStats]       = useState<UserStats>({ xp: 0, level: 1 });
  const [tab,         setTab]         = useState<"tasks"|"habits"|"notes"|"motivasi">("tasks");
  const [focusMode,   setFocus]       = useState(false);
  const [isPinned,    setPin]         = useState(false);
  const [quoteIdx,    setQuoteIdx]    = useState(0);
  const [quoteVis,    setQuoteVis]    = useState(true);
  const [clock,       setClock]       = useState(new Date());

  // Pomodoro timer states
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [pomoActive,  setPomoActive]  = useState(false);
  const pomoTotal = 25 * 60;

  // inline adds
  const [addTask,     setAddTask]     = useState(false);
  const [taskText,    setTaskText]    = useState("");
  const [addHabit,    setAddHabit]    = useState(false);
  const [habitText,   setHabitText]   = useState("");
  const [addNote,     setAddNote]     = useState(false);
  const [noteText,    setNoteText]    = useState("");

  // motivation form
  const [addMotiv,    setAddMotiv]    = useState(false);
  const [editMotiv,   setEditMotiv]   = useState<Motivation|null>(null);
  const [motivTxt,    setMotivTxt]    = useState("");
  const [motivAuth,   setMotivAuth]   = useState("");

  // float indicators
  const [xpPop,       setXpPop]       = useState<{ show: boolean; amount: string }>({ show: false, amount: "" });
  const [lvlUpShow,   setLvlUpShow]   = useState(false);

  // Ambient Soundscape state & refs
  const [ambientType, setAmbientType] = useState<"rain" | "wind" | "brown" | "off">("off");
  const [ambientVol, setAmbientVol]   = useState(0.25);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  // Daily Mood Tracker state
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [todayMood, setTodayMood]     = useState<string | null>(null);

  useEffect(() => {
    if (!focusMode) {
      setAmbientType("off");
    }
  }, [focusMode]);

  useEffect(() => {
    const stopAudio = () => {
      try {
        if (noiseSourceRef.current) {
          noiseSourceRef.current.stop();
          noiseSourceRef.current.disconnect();
          noiseSourceRef.current = null;
        }
        if (lfoRef.current) {
          lfoRef.current.stop();
          lfoRef.current.disconnect();
          lfoRef.current = null;
        }
        if (filterRef.current) {
          filterRef.current.disconnect();
          filterRef.current = null;
        }
        if (gainNodeRef.current) {
          gainNodeRef.current.disconnect();
          gainNodeRef.current = null;
        }
      } catch (e) {
        console.error("Stop audio error:", e);
      }
    };

    stopAudio();

    if (ambientType === "off" || !focusMode) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      if (ambientType === "brown") {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
      } else {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 * 0.5362;
          data[i] *= 0.11;
          b6 = white * 0.115926;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      noiseSourceRef.current = source;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(ambientVol, ctx.currentTime);
      gainNodeRef.current = gain;

      const filter = ctx.createBiquadFilter();
      filterRef.current = filter;

      if (ambientType === "rain") {
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(950, ctx.currentTime);
        source.connect(filter);
        filter.connect(gain);
      } else if (ambientType === "wind") {
        filter.type = "bandpass";
        filter.Q.setValueAtTime(2.5, ctx.currentTime);
        filter.frequency.setValueAtTime(450, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(0.06, ctx.currentTime);
        lfoRef.current = lfo;

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(250, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        source.connect(filter);
        filter.connect(gain);
        lfo.start();
      } else if (ambientType === "brown") {
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(350, ctx.currentTime);
        source.connect(filter);
        filter.connect(gain);
      }

      gain.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.error("Synthesizer error:", e);
    }

    return () => {
      stopAudio();
    };
  }, [ambientType, ambientVol, focusMode]);

  const taskRef  = useRef<HTMLInputElement>(null);
  const habitRef = useRef<HTMLInputElement>(null);
  const noteRef  = useRef<HTMLTextAreaElement>(null);
  const motivRef = useRef<HTMLTextAreaElement>(null);

  const focusActiveSecondsRef = useRef(0);

  const triggerHealthReminder = () => {
    playSound("finish_pomodoro");
    if (Notification.permission === "granted") {
      new Notification("Aether Health Reminder 💧", {
        body: "Kamu sudah fokus selama 45 menit. Ayo berdiri, minum segelas air, dan regangkan ototmu sebentar! 🧘‍♂️",
        silent: true,
      });
    }
  };

  // ── Live Clock & Pomodoro Timer ─────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Pomodoro countdown timer tick & Smart Health Reminders
  useEffect(() => {
    let timer: any;
    if (pomoActive) {
      timer = setInterval(() => {
        focusActiveSecondsRef.current += 1;
        if (focusActiveSecondsRef.current >= 2700) {
          triggerHealthReminder();
          focusActiveSecondsRef.current = 0;
        }

        setPomoSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setPomoActive(false);
            finishPomodoro();
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pomoActive]);

  // ── Quote rotation ──────────────────────────────────────────
  useEffect(() => {
    if (!motivations.length) return;
    const t = setInterval(() => {
      setQuoteVis(false);
      setTimeout(() => {
        setQuoteIdx((i) => (i + 1) % motivations.length);
        setQuoteVis(true);
      }, 500);
    }, 15000);
    return () => clearInterval(t);
  }, [motivations.length]);

  // ── Data & Stats Fetch ──────────────────────────────────────
  const fetchData = async () => {
    try {
      const wd = await invoke<WidgetData>("get_widget_data");
      setData(wd);
      setFocus(wd.focus_mode);
      const caps = await invoke<Task[]>("search_captures", { query: "" });
      setCaptures(caps);
    } catch {}
  };
  const fetchMotivs = async () => {
    try {
      const ms = await invoke<Motivation[]>("get_motivations");
      setMotivs(ms);
    } catch {}
  };
  const fetchHabits = async () => {
    try {
      const hs = await invoke<Habit[]>("get_habits");
      setHabits(hs);
    } catch {}
  };
  const fetchStats = async () => {
    try {
      const st = await invoke<UserStats>("get_user_stats");
      setStats(st);
    } catch {}
  };
  const fetchTheme = async () => {
    try {
      const t = await invoke<string>("get_theme");
      if (t in THEMES) {
        setCurrentTheme(t as any);
      }
    } catch {}
  };
  const fetchMoods = async () => {
    try {
      const history = await invoke<MoodEntry[]>("get_mood_history");
      setMoodHistory(history);
      const todayStr = new Date().toLocaleDateString("sv-SE");
      const foundToday = history.find(m => m.date === todayStr);
      if (foundToday) setTodayMood(foundToday.mood);
      else            setTodayMood(null);
    } catch {}
  };
  const handleRecordMood = async (mood: string) => {
    try {
      const nextStats = await invoke<UserStats>("record_mood", { mood });
      const todayStr = new Date().toLocaleDateString("sv-SE");
      const alreadyChecked = moodHistory.some(m => m.date === todayStr);
      handleXPDelta(alreadyChecked ? 0 : 10, nextStats);
      await fetchMoods();
    } catch {}
  };

  useEffect(() => {
    fetchTheme();
    fetchData();
    fetchMotivs();
    fetchHabits();
    fetchStats();
    fetchMoods();
    const iv = setInterval(() => {
      fetchData();
      fetchHabits();
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { if (addTask) taskRef.current?.focus(); }, [addTask]);
  useEffect(() => { if (addHabit) habitRef.current?.focus(); }, [addHabit]);
  useEffect(() => { if (addNote) noteRef.current?.focus(); }, [addNote]);
  useEffect(() => { if (addMotiv||editMotiv) motivRef.current?.focus(); }, [addMotiv, editMotiv]);

  // ── Pomodoro Finished ────────────────────────────────────────
  const finishPomodoro = async () => {
    playSound("finish_pomodoro");
    if (Notification.permission === "granted") {
      new Notification("Aether Pomodoro Selesai!", {
        body: "Luar biasa! Sesi fokus selesai. Kamu mendapatkan +50 XP! ⚡",
        silent: true,
      });
    }
    // Grant 50 XP
    try {
      const nextStats = await invoke<UserStats>("add_xp", { amount: 50 });
      handleXPDelta(50, nextStats);
    } catch {}
  };

  // ── XP gain popup feedback ──────────────────────────────────
  const handleXPDelta = (amount: number, newStats: UserStats) => {
    if (newStats.level > stats.level) {
      // LEVEL UP!
      playSound("levelup");
      setLvlUpShow(true);
      setTimeout(() => setLvlUpShow(false), 4500);
    } else {
      playSound("complete");
    }
    setStats(newStats);
    setXpPop({ show: true, amount: amount > 0 ? `+${amount} XP` : `${amount} XP` });
    setTimeout(() => setXpPop({ show: false, amount: "" }), 2000);
  };

  // ── Handlers ────────────────────────────────────────────────
  const drag = async (e: React.MouseEvent) => {
    e.preventDefault();
    try { await appWindow.startDragging(); } catch {}
  };
  
  const handlePin = async () => {
    const next = !isPinned;
    setPin(next);
    try { await invoke("set_widget_pin", { pinned: next }); } catch {}
  };

  const handleFocus = async () => {
    try {
      const active = await invoke<boolean>("toggle_focus_mode");
      setFocus(active);
      if (active) {
        setPomoSeconds(25 * 60);
        setPomoActive(true);
      } else {
        setPomoActive(false);
      }
      await fetchData();
    } catch {}
  };

  const toggleTask = async (id: number) => {
    try {
      const nextStats = await invoke<UserStats>("toggle_task_completion", { id });
      const currentTask = captures.find(t => t.id === id);
      const isCompleted = currentTask ? !currentTask.completed : true;
      handleXPDelta(isCompleted ? 10 : -10, nextStats);
      await fetchData();
    } catch {}
  };

  const delCapture = async (id: number) => {
    try { await invoke("delete_capture", { id }); await fetchData(); } catch {}
  };

  const toggleHabit = async (id: number) => {
    try {
      const nextStats = await invoke<UserStats>("toggle_habit_completion", { id });
      const currentHabit = habits.find(h => h.id === id);
      
      // Determine if completed today
      let isCompletedNow = true;
      if (currentHabit && currentHabit.last_completed) {
        const todayStr = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
        if (currentHabit.last_completed === todayStr) {
          isCompletedNow = false; // toggling off
        }
      }
      handleXPDelta(isCompletedNow ? 15 : -15, nextStats);
      await fetchHabits();
    } catch {}
  };

  const submitTask = async () => {
    if (!taskText.trim()) { setAddTask(false); return; }
    try {
      await invoke("save_widget_capture", { text: taskText.trim(), capType: "task" });
      setTaskText(""); setAddTask(false);
      await fetchData();
    } catch {}
  };

  const submitHabit = async () => {
    if (!habitText.trim()) { setAddHabit(false); return; }
    try {
      await invoke("add_habit", { text: habitText.trim() });
      setHabitText(""); setAddHabit(false);
      await fetchHabits();
    } catch {}
  };

  const handleDeleteHabit = async (id: number) => {
    try { await invoke("delete_habit", { id }); await fetchHabits(); } catch {}
  };

  const submitNote = async () => {
    if (!noteText.trim()) { setAddNote(false); return; }
    try {
      await invoke("save_widget_capture", { text: noteText.trim(), capType: "note" });
      setNoteText(""); setAddNote(false);
      await fetchData();
    } catch {}
  };

  const submitMotiv = async () => {
    if (!motivTxt.trim()) return;
    const author = motivAuth.trim() || "Anonim";
    try {
      if (editMotiv) await invoke("update_motivation", { id: editMotiv.id, text: motivTxt.trim(), author });
      else           await invoke("add_motivation", { text: motivTxt.trim(), author });
      setMotivTxt(""); setMotivAuth(""); setAddMotiv(false); setEditMotiv(null);
      await fetchMotivs();
    } catch {}
  };

  const startEdit = (m: Motivation) => {
    setEditMotiv(m); setMotivTxt(m.text); setMotivAuth(m.author); setAddMotiv(false);
  };
  
  const cancelForm = () => {
    setEditMotiv(null); setAddMotiv(false); setMotivTxt(""); setMotivAuth("");
  };

  const delMotiv = async (id: number) => {
    try { await invoke("delete_motivation", { id }); await fetchMotivs(); } catch {}
  };

  const nextQuote = () => {
    if (!motivations.length) return;
    setQuoteVis(false);
    setTimeout(() => {
      setQuoteIdx((i) => (i + 1) % motivations.length);
      setQuoteVis(true);
    }, 300);
  };

  // ── Computed stats details ──────────────────────────────────
  const tasksList = data?.tasks || [];
  const notes     = captures.filter((c) => c.cap_type === "note");
  const pending   = tasksList.filter((t) => !t.completed);
  const pendingSorted = [...pending].sort((a, b) => {
    const prioA = getTaskPriority(a.text);
    const prioB = getTaskPriority(b.text);
    const val = { high: 3, medium: 2, low: 1 };
    return val[prioB] - val[prioA];
  });
  const done      = tasksList.filter((t) => t.completed);

  const getAICoachAdvice = () => {
    const uncompletedHabits = habits.filter(h => {
      const todayStr = new Date().toLocaleDateString("sv-SE");
      return h.last_completed !== todayStr;
    });

    if (todayMood === "tired" || todayMood === "anxious") {
      return "Halo! Saya mendeteksi hari ini energi atau emosimu sedang tidak stabil. Jangan terlalu memaksakan diri. Selesaikan 1 tugas penting saja, lalu luangkan waktu untuk beristirahat. Ingat, kesehatanmu nomor satu! 🧘‍♂️";
    }
    if (pending.length === 0 && done.length > 0) {
      return "Luar biasa! Semua tugas hari ini telah kamu selesaikan dengan sempurna. Kamu menunjukkan disiplin tingkat tinggi hari ini. Ambil waktu santai untuk menikmati harimu! 🏆";
    }
    if (uncompletedHabits.length > 0) {
      return `Ada kebiasaan harian (${uncompletedHabits[0].text}) yang belum kamu centang hari ini. Sempatkan waktu 5 menit sekarang agar streak disiplinmu tidak terputus! 🔥`;
    }
    if (pending.length > 0) {
      const urgentTask = pendingSorted.find(t => getTaskPriority(t.text) === "high");
      if (urgentTask) {
        return `Kamu memiliki tugas mendesak hari ini: "${urgentTask.text}". Ambil waktu 25 menit sesi Pomodoro sekarang untuk fokus menyelesaikannya! ⚡`;
      }
      return "Kondisimu tampak prima hari ini. Mari kita buat kemajuan kecil dengan mulai menyelesaikan satu tugas paling mudah terlebih dahulu. Konsistensi adalah kunci! 🚀";
    }
    return "Selamat datang di Aether! Tulis tugas pertamamu hari ini dan mari kita bangun kebiasaan produktif bersama-sama. Kamu bisa melakukannya! ✦";
  };
  
  // XP Level Up Threshold
  const maxXP = stats.level * 100;
  const xpPercentage = Math.min((stats.xp / maxXP) * 100, 100);

  const quote = motivations[quoteIdx % Math.max(motivations.length, 1)];
  const quoteAcc = QUOTE_ACCENTS[quoteIdx % QUOTE_ACCENTS.length];
  const hh = clock.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
  const ss = String(clock.getSeconds()).padStart(2, "0");
  const dayName = data?.date?.split(",")[0]?.trim() || "";
  const dateRest = data?.date?.split(",").slice(1).join(",").trim() || "";

  // Pomodoro rendering
  const minLeft = Math.floor(pomoSeconds / 60);
  const secLeft = String(pomoSeconds % 60).padStart(2, "0");
  const pomoPct = ((pomoTotal - pomoSeconds) / pomoTotal) * 100;

  const borderCol = focusMode ? `rgba(${rgb(C.accent)},0.5)`
                  : isPinned  ? `rgba(${rgb(C.warning)},0.4)`
                  : C.border;
  const outerGlow = focusMode ? `0 0 45px rgba(${rgb(C.accent)},0.12)`
                  : isPinned  ? `0 0 45px rgba(${rgb(C.warning)},0.08)`
                  : "none";

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      borderRadius: "24px", overflow: "hidden",
      background: C.bg,
      border: `1.5px solid ${borderCol}`,
      boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 4px 24px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04), ${outerGlow}`,
      fontFamily: "'Segoe UI Variable','Segoe UI',-apple-system,sans-serif",
      userSelect: "none",
      transition: "border 0.35s ease, box-shadow 0.35s ease",
      position: "relative",
    }}>

      {/* Level Up Announcement Overlay Banner */}
      {lvlUpShow && (
        <div style={{
          position: "absolute", top: "12px", left: "12px", right: "12px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          padding: "10px 14px", borderRadius: "14px", zIndex: 100,
          boxShadow: "0 10px 30px rgba(99,102,241,0.4)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
          border: "1px solid rgba(255,255,255,0.2)",
          animation: "slideDown 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards",
        }}>
          <span style={{ fontSize: "14px" }}>🎉 LEVEL UP! 🎉</span>
          <span style={{ fontSize: "11px", color: "#c7d2fe", fontWeight: 600 }}>
            Kamu mencapai Level {stats.level}!
          </span>
          <span style={{ fontSize: "10px", color: "#a5b4fc", fontStyle: "italic" }}>
            {getLevelName(stats.level)}
          </span>
        </div>
      )}

      {/* Floating XP Gain Badge popup */}
      {xpPop.show && (
        <div style={{
          position: "absolute", top: "80px", right: "20px",
          background: "rgba(16,185,129,0.9)", color: "#ffffff",
          padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
          boxShadow: "0 0 15px rgba(16,185,129,0.4)", zIndex: 99,
          animation: "floatUp 1.8s ease-in-out forwards",
        }}>
          {xpPop.amount}
        </div>
      )}

      {/* ══════════════════════════════════════════
          HEADER — Gamified XP Bar & Live Clock
      ══════════════════════════════════════════ */}
      <div onMouseDown={drag} style={{
        padding: "15px 18px 12px", flexShrink: 0, cursor: "grab",
        background: "rgba(255,255,255,0.015)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        {/* Top: Stats Header Level & Clock */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-1.2px", color: C.textPrimary, lineHeight: 1 }}>
                {hh}
              </span>
              <span style={{ fontSize: "13px", color: C.textMuted }}>:{ss}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: C.textPrimary }}>{dayName}</span>
              <span style={{ fontSize: "10.5px", color: C.textSec }}>{dateRest}</span>
            </div>
          </div>

          {/* Gamification Indicator */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "10px", color: C.textSec, fontWeight: 700, textTransform: "uppercase" }}>
              Level {stats.level}
            </span>
            <span style={{ fontSize: "10px", color: C.accentLight, fontWeight: 600 }}>
              {getLevelName(stats.level).split(" ")[0]}
            </span>
            <span style={{ fontSize: "9px", color: C.textMuted }}>
              {stats.xp}/{maxXP} XP
            </span>
          </div>
        </div>

        {/* Level XP Bar */}
        <div style={{ marginTop: "8px" }}>
          <div style={{ height: "4px", borderRadius: "99px", background: "rgba(255,255,255,0.05)", overflow: "hidden", position: "relative" }}>
            <div style={{
              height: "100%", width: `${xpPercentage}%`,
              borderRadius: "99px",
              background: `linear-gradient(90deg, ${C.accent}, ${C.accentLight})`,
              boxShadow: `0 0 10px rgba(${rgb(C.accent)},0.5)`,
              transition: "width 0.5s ease",
            }}/>
          </div>
        </div>

        {/* Theme dots & controls */}
        <div style={{ display: "flex", gap: "10px", marginTop: "12px", justifyContent: "space-between", alignItems: "center" }} onMouseDown={e => e.stopPropagation()}>
          {/* Theme selection dots */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", maxWidth: "200px" }}>
            {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((t) => {
              const active = currentTheme === t;
              const dotColors = {
                navy: "#6366f1", cyberpunk: "#d946ef", forest: "#10b981", amber: "#f59e0b",
                royal: "#a855f7", ocean: "#0ea5e9", sunset: "#f43f5e"
              };
              return (
                <button
                  key={t}
                  onClick={async () => {
                    playSound("click");
                    setCurrentTheme(t);
                    try { await invoke("set_theme", { theme: t }); } catch {}
                  }}
                  style={{
                    width: "12px", height: "12px", borderRadius: "50%",
                    background: dotColors[t],
                    border: active ? "1.5px solid #ffffff" : "1px solid transparent",
                    cursor: "pointer", padding: 0,
                    boxShadow: active ? `0 0 8px ${dotColors[t]}` : "none",
                    transition: "transform 0.2s",
                    transform: active ? "scale(1.2)" : "scale(1)",
                  }}
                  title={`Ubah tema ke ${THEMES[t].name}`}
                />
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <PinBtn pinned={isPinned} onClick={handlePin} />
            <FocusBtn active={focusMode} onClick={handleFocus} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          POMODORO INTERACTIVE FOCUS TIMER
      ══════════════════════════════════════════ */}
      {focusMode && (
        <div style={{
          padding: "14px 18px", flexShrink: 0,
          background: "rgba(99,102,241,0.06)",
          borderBottom: `1px solid rgba(99,102,241,0.2)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        }} onMouseDown={e => e.stopPropagation()}>
          <span style={{ fontSize: "10px", color: C.accentLight, fontWeight: 700, letterSpacing: "0.1em" }}>
            ⏱️ SESI FOKUS POMODORO
          </span>
          
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <span style={{
              fontSize: "28px", fontWeight: 700, color: C.textPrimary, fontVariantNumeric: "tabular-nums",
              animation: pomoActive ? "breathe 3s ease-in-out infinite" : "none"
            }}>
              {minLeft}:{secLeft}
            </span>

            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => { playSound("click"); setPomoActive(!pomoActive); }}
                style={{
                  padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                  background: pomoActive ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                  color: pomoActive ? C.danger : C.success,
                  border: "none", cursor: "pointer",
                }}
              >
                {pomoActive ? "Pause" : "Mulai"}
              </button>
              <button
                onClick={() => { playSound("click"); setPomoActive(false); setPomoSeconds(25 * 60); }}
                style={{
                  padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                  background: "rgba(255,255,255,0.05)", color: C.textSec,
                  border: "none", cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Pomodoro Progress Bar */}
          <div style={{ width: "100%", height: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pomoPct}%`,
              background: C.accentLight,
              transition: "width 1s linear",
            }}/>
          </div>

          {/* Ambient Soundscapes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", marginTop: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: C.textSec, fontWeight: 700, letterSpacing: "0.05em" }}>AMBIENT SOUNDSCAPE</span>
              <span style={{ fontSize: "9px", color: C.textMuted }}>Vol: {Math.round(ambientVol * 125)}%</span>
            </div>
            
            <div style={{ display: "flex", gap: "3px", width: "100%" }}>
              {[
                { id: "off", label: "🔇 Mute" },
                { id: "rain", label: "🌧️ Hujan" },
                { id: "wind", label: "🍃 Angin" },
                { id: "brown", label: "🟫 Brown" }
              ].map((s) => {
                const isS = ambientType === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { playSound("click"); setAmbientType(s.id as any); }}
                    style={{
                      flex: 1, padding: "4px 0", borderRadius: "6px", fontSize: "10px", fontWeight: 600,
                      background: isS ? `rgba(${rgb(C.accent)},0.2)` : "rgba(255,255,255,0.02)",
                      color: isS ? C.accentLight : C.textSec,
                      border: isS ? `1px solid rgba(${rgb(C.accent)},0.35)` : "1px solid transparent",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {ambientType !== "off" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", marginTop: "2px" }}>
                <span style={{ fontSize: "10px" }}>🔈</span>
                <input
                  type="range" min="0" max="0.8" step="0.05"
                  value={ambientVol}
                  onChange={(e) => setAmbientVol(parseFloat(e.target.value))}
                  style={{
                    flex: 1, height: "3px", borderRadius: "99px",
                    accentColor: C.accent, background: "rgba(255,255,255,0.1)",
                    outline: "none", cursor: "pointer",
                  }}
                />
                <span style={{ fontSize: "10px" }}>🔊</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          QUOTE STRIP — Motivation rotator
      ══════════════════════════════════════════ */}
      {quote && (
        <div onClick={nextQuote} onMouseDown={e=>e.stopPropagation()} title="Klik untuk quote berikutnya" style={{
          padding: "11px 18px 10px", flexShrink: 0, cursor: "pointer",
          background: `linear-gradient(135deg, rgba(${rgb(quoteAcc)},0.07) 0%, rgba(${rgb(quoteAcc)},0.02) 100%)`,
          borderBottom: `1px solid rgba(${rgb(quoteAcc)},0.13)`,
          opacity: quoteVis ? 1 : 0, transition: "opacity 0.5s ease",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: "1px", left: "12px", fontSize: "32px", color: `rgba(${rgb(quoteAcc)},0.18)`, fontFamily: "Georgia,serif", pointerEvents: "none" }}>"</div>
          <p style={{ margin: 0, fontSize: "11.5px", lineHeight: "1.65", color: "#c5d0e4", paddingLeft: "18px", paddingRight: "18px", fontStyle: "italic" }}>
            {quote.text}
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: "18px", marginTop: "5px" }}>
            <span style={{ fontSize: "9.5px", color: quoteAcc, fontWeight: 700 }}>— {quote.author}</span>
            <span style={{ fontSize: "8.5px", color: "rgba(255,255,255,0.1)" }}>tap ›</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB BAR — 4 Interactive Tabs
      ══════════════════════════════════════════ */}
      <div style={{
        display: "flex", padding: "6px 8px", gap: "3px", flexShrink: 0,
        background: "rgba(0,0,0,0.18)",
      }} onMouseDown={e=>e.stopPropagation()}>
        {[
          { id: "tasks", label: "Tugas", icon: "📋", count: pending.length },
          { id: "habits", label: "Habit", icon: "🔥", count: habits.length },
          { id: "notes", label: "Jurnal", icon: "📝", count: notes.length },
          { id: "motivasi", label: "Inspirasi", icon: "✨", count: motivations.length }
        ].map((t) => {
          const isAct = tab === t.id;
          return (
            <button key={t.id} onClick={() => { playSound("click"); setTab(t.id as any); }} style={{
              flex: 1, padding: "5px 1px 4px", borderRadius: "8px", cursor: "pointer",
              border: isAct ? `1px solid rgba(${rgb(C.accent)},0.35)` : "1px solid transparent",
              background: isAct ? `rgba(${rgb(C.accent)},0.18)` : "transparent",
              color: isAct ? C.accentLight : C.textSec,
              fontSize: "10px", fontWeight: isAct ? 700 : 500,
              display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
              transition: "all 0.15s",
            }}>
              <span style={{ fontSize: "13px" }}>{t.icon}</span>
              <span>{t.label}{t.count > 0 && t.id !== "motivasi" ? ` (${t.count})` : ""}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          CONTENT SCROLLER
      ══════════════════════════════════════════ */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px", scrollbarWidth: "none", animation: "fadeInSoft 0.4s ease-out forwards" }} onMouseDown={e=>e.stopPropagation()}>

        {/* ── TUGAS ──────────────────────────────────────── */}
        {tab === "tasks" && (
          <div>
            {tasksList.length === 0 && !addTask && <EmptyState icon="✅" title="Selesai Semua!" sub='Ketuk "+ Tambah Tugas" dan dapatkan +10 XP tiap penyelesaian!' />}

            {pending.length > 0 && <SLabel text={`TUGAS AKTIF (+10 XP)  ·  ${pending.length}`} />}
            {pendingSorted.map(t => <TaskRow key={t.id} task={t} onToggle={toggleTask} onDel={delCapture} />)}

            {done.length > 0 && <SLabel text={`SELESAI ✓  ·  ${done.length}`} />}
            {done.map(t => <TaskRow key={t.id} task={t} onToggle={toggleTask} onDel={delCapture} />)}

            {addTask ? (
              <div style={{ display: "flex", gap: "5px", marginTop: "8px", alignItems: "center" }}>
                <input ref={taskRef} value={taskText} onChange={e=>setTaskText(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter") submitTask(); if(e.key==="Escape"){setAddTask(false);setTaskText("");} }}
                  placeholder="Nama tugas baru..."
                  style={inStyle} />
                <button onClick={submitTask} style={okBtn}>✓</button>
                <button onClick={()=>{setAddTask(false);setTaskText("");}} style={xBtn}>✕</button>
              </div>
            ) : (
              <AddRowBtn label="Tambah Tugas" onClick={() => setAddTask(true)} />
            )}
          </div>
        )}

        {/* ── HABIT / KEBIASAAN ───────────────────────────── */}
        {tab === "habits" && (
          <div>
            {habits.length === 0 && !addHabit && <EmptyState icon="🔥" title="Bangun Habit Produktif" sub='Kembangkan streak kebiasaanmu dan dapatkan +15 XP setiap hari!' />}

            {habits.length > 0 && <SLabel text={`HABIT HARIAN (+15 XP)`} />}
            {habits.map(h => {
              // Determine if completed today
              const todayStr = new Date().toLocaleDateString("sv-SE");
              const completedToday = h.last_completed === todayStr;

              return (
                <div key={h.id} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 10px", marginBottom: "4px", borderRadius: "10px",
                  background: completedToday ? "rgba(16,185,129,0.03)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${completedToday ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)"}`,
                  position: "relative",
                }}>
                  {/* Streak Toggle Checkbox */}
                  <div onClick={() => toggleHabit(h.id)} style={{
                    width: "18px", height: "18px", borderRadius: "6px",
                    border: completedToday ? `2px solid ${C.success}` : "2px solid rgba(255,255,255,0.2)",
                    background: completedToday ? C.success : "transparent",
                    display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
                  }}>
                    {completedToday && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Habit Name */}
                  <span onClick={() => toggleHabit(h.id)} style={{
                    fontSize: "13px", flex: 1, cursor: "pointer",
                    color: completedToday ? C.textSec : C.textPrimary,
                    textDecoration: completedToday ? "line-through" : "none",
                    wordBreak: "break-word",
                  }}>{h.text}</span>

                  {/* Streak Fire Badge */}
                  <span style={{
                    fontSize: "11px", fontWeight: 700, color: C.warning,
                    background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: "6px",
                    display: "flex", alignItems: "center", gap: "2px",
                  }}>
                    🔥 {h.streak}d
                  </span>

                  {/* Delete Button */}
                  <button onClick={() => handleDeleteHabit(h.id)} style={{
                    marginLeft: "6px", padding: "2px 6px", borderRadius: "5px", border: "none",
                    background: "rgba(239,68,68,0.15)", color: C.danger, fontSize: "10px", cursor: "pointer",
                  }}>
                    ✕
                  </button>
                </div>
              );
            })}

            {addHabit ? (
              <div style={{ display: "flex", gap: "5px", marginTop: "8px", alignItems: "center" }}>
                <input ref={habitRef} value={habitText} onChange={e=>setHabitText(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter") submitHabit(); if(e.key==="Escape"){setAddHabit(false);setHabitText("");} }}
                  placeholder="Nama habit baru..."
                  style={inStyle} />
                <button onClick={submitHabit} style={okBtn}>✓</button>
                <button onClick={()=>{setAddHabit(false);setHabitText("");}} style={xBtn}>✕</button>
              </div>
            ) : (
              <AddRowBtn label="Tambah Kebiasaan" onClick={() => setAddHabit(true)} />
            )}
          </div>
        )}

        {/* ── JURNAL ─────────────────────────────────────── */}
        {tab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "7px", paddingTop: "2px" }}>
            {/* Mood Check-in Card */}
            <div style={{
              padding: "12px 14px", borderRadius: "14px",
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${C.border}`,
              marginBottom: "4px", display: "flex", flexDirection: "column", gap: "10px"
            }}>
              {!todayMood ? (
                <>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: C.accentLight, letterSpacing: "0.05em" }}>
                    BAGAIMANA MOOD-MU HARI INI? (+10 XP)
                  </span>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "6px" }}>
                    {[
                      { id: "calm", emoji: "😊", label: "Calm" },
                      { id: "happy", emoji: "😄", label: "Happy" },
                      { id: "neutral", emoji: "😐", label: "Neutral" },
                      { id: "tired", emoji: "😴", label: "Tired" },
                      { id: "anxious", emoji: "😔", label: "Anxious" }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleRecordMood(m.id)}
                        style={{
                          flex: 1, padding: "8px 0", borderRadius: "8px",
                          background: "rgba(255,255,255,0.03)", border: "1px solid transparent",
                          fontSize: "18px", cursor: "pointer", display: "flex", flexDirection: "column",
                          alignItems: "center", gap: "4px", transition: "transform 0.2s"
                        }}
                        title={m.label}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      >
                        <span>{m.emoji}</span>
                        <span style={{ fontSize: "8.5px", color: C.textSec }}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: C.textPrimary }}>
                      Mood Hari Ini: &nbsp;
                      {
                        {
                          calm: "😊 Calm",
                          happy: "😄 Happy",
                          neutral: "😐 Neutral",
                          tired: "😴 Tired",
                          anxious: "😔 Anxious"
                        }[todayMood] || todayMood
                      }
                    </span>
                    <button
                      onClick={() => handleRecordMood("")}
                      style={{
                        background: "none", border: "none", fontSize: "10px", color: C.accentLight,
                        cursor: "pointer", textDecoration: "underline"
                      }}
                    >
                      Ubah
                    </button>
                  </div>

                  {/* 7-Day History Visualization */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "8px" }}>
                    <span style={{ fontSize: "9px", color: C.textSec, fontWeight: 700, letterSpacing: "0.08em" }}>RIWAYAT MOOD (7 HARI TERAKHIR)</span>
                    <div style={{ display: "flex", gap: "5px" }}>
                      {moodHistory.map((h, i) => {
                        const colors = { calm: "#3b82f6", happy: "#10b981", neutral: "#94a3b8", tired: "#8b5cf6", anxious: "#f59e0b" };
                        const color = (colors as any)[h.mood] || "#ffffff";
                        const emojis = { calm: "😊", happy: "😄", neutral: "😐", tired: "😴", anxious: "😔" };
                        const emoji = (emojis as any)[h.mood] || "❓";
                        const dateObj = new Date(h.date);
                        const dayLabel = dateObj.toLocaleDateString("id-ID", { weekday: "short" });

                        return (
                          <div
                            key={h.id || i}
                            style={{
                              flex: 1, padding: "5px 2px", borderRadius: "8px",
                              background: "rgba(255,255,255,0.02)", border: `1px solid rgba(${rgb(color)},0.18)`,
                              display: "flex", flexDirection: "column", alignItems: "center", gap: "2px"
                            }}
                          >
                            <span style={{ fontSize: "11px" }}>{emoji}</span>
                            <span style={{ fontSize: "8px", color: C.textMuted, fontWeight: 700 }}>{dayLabel}</span>
                          </div>
                        );
                      })}
                      {Array.from({ length: Math.max(0, 7 - moodHistory.length) }).map((_, idx) => (
                        <div
                          key={`empty-${idx}`}
                          style={{
                            flex: 1, padding: "5px 2px", borderRadius: "8px",
                            background: "rgba(255,255,255,0.01)", border: `1px dashed rgba(255,255,255,0.04)`,
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "2px"
                          }}
                        >
                          <span style={{ fontSize: "11px", opacity: 0.15 }}>⚪</span>
                          <span style={{ fontSize: "8px", color: C.textMuted, opacity: 0.3 }}>-</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {notes.length === 0 && !addNote && <EmptyState icon="📝" title="Jurnal Harian" sub='Tulis refleksi hari ini, ide menarik, atau rasa syukur untuk menjaga pikiranmu tetap jernih!' />}

            {notes.map((n, i) => (
              <NoteCard key={n.id} note={n} accent={NOTE_ACCENTS[i % NOTE_ACCENTS.length]} onDel={delCapture} />
            ))}

            {addNote ? (
              <div style={{ marginTop: "4px" }}>
                <textarea ref={noteRef} value={noteText} onChange={e=>setNoteText(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter"&&e.ctrlKey) submitNote(); if(e.key==="Escape"){setAddNote(false);setNoteText("");} }}
                  placeholder="Tulis jurnal/refleksi... (Ctrl+Enter simpan)"
                  rows={3} style={taStyle} />
                <div style={{ display:"flex", gap:"5px", marginTop:"6px" }}>
                  <button onClick={submitNote} style={{...okBtn, flex:1, justifyContent:"center"}}>Simpan Jurnal</button>
                  <button onClick={()=>{setAddNote(false);setNoteText("");}} style={xBtn}>✕</button>
                </div>
              </div>
            ) : (
              <AddRowBtn label="Tulis Jurnal Harian" onClick={() => setAddNote(true)} />
            )}
          </div>
        )}

        {/* ── INSPIRASI ──────────────────────────────────── */}
        {tab === "motivasi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "2px" }}>
            {/* AI Productivity Coach Card */}
            <div style={{
              padding: "13px 15px", borderRadius: "14px",
              background: `linear-gradient(135deg, rgba(${rgb(C.accent)},0.11) 0%, rgba(${rgb(C.accent)},0.03) 100%)`,
              border: `1px solid rgba(${rgb(C.accent)},0.28)`,
              position: "relative"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                <span style={{ fontSize: "16px" }}>🤖</span>
                <span style={{ fontSize: "11px", fontWeight: 800, color: C.accentLight, letterSpacing: "0.06em" }}>
                  AI PRODUCTIVITY COACH
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "12.5px", color: C.textPrimary, lineHeight: "1.65" }}>
                {getAICoachAdvice()}
              </p>
            </div>
            {/* Form */}
            {(addMotiv || editMotiv) && (
              <div style={{ padding: "12px", borderRadius: "14px", background: `rgba(${rgb(C.accent)},0.07)`, border: `1.5px solid rgba(${rgb(C.accent)},0.28)` }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: C.accentLight, display: "block", marginBottom: "8px" }}>
                  {editMotiv ? "✏️ Edit Motivasi" : "✨ Tambah Motivasi"}
                </span>
                <textarea ref={motivRef} value={motivTxt} onChange={e=>setMotivTxt(e.target.value)}
                  placeholder="Tulis motivasi pembangun..." rows={2} style={{ ...taStyle, marginBottom: "6px" }} />
                <input value={motivAuth} onChange={e=>setMotivAuth(e.target.value)}
                  placeholder="Penulis (opsional)" style={{ ...inStyle, fontSize: "11.5px", marginBottom: "8px" }} />
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={submitMotiv} style={{...okBtn, flex:1, justifyContent:"center"}}>Simpan</button>
                  <button onClick={cancelForm} style={xBtn}>Batal</button>
                </div>
              </div>
            )}

            {motivations.length === 0 && !addMotiv && <EmptyState icon="✨" title="Kelola Inspirasi" sub="Simpan kata-kata motivasi favoritmu agar berputar di halaman atas widget!" />}

            {motivations.map((m, i) => {
              const acc = QUOTE_ACCENTS[i % QUOTE_ACCENTS.length];
              return (
                <div key={m.id} style={{
                  padding: "10px 12px", borderRadius: "12px", position: "relative",
                  background: `rgba(${rgb(acc)},0.04)`, border: `1.5px solid rgba(${rgb(acc)},0.12)`,
                }}>
                  <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"3px", background:`linear-gradient(180deg,${acc},transparent)`, borderRadius:"3px 0 0 3px" }}/>
                  <p style={{ margin:0, fontSize: "11.5px", color: C.textPrimary, lineHeight: "1.65", fontStyle: "italic" }}>"{m.text}"</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"6px" }}>
                    <span style={{ fontSize: "9.5px", color: acc, fontWeight: 700 }}>— {m.author}</span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <span onClick={() => startEdit(m)} style={editBadge}>edit</span>
                      <span onClick={() => delMotiv(m.id)} style={deleteBadge}>hapus</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {!addMotiv && !editMotiv && <AddRowBtn label="Tambah Inspirasi Baru" onClick={() => setAddMotiv(true)} />}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          FOOTER — Drag Area & App Shortcut Info
      ══════════════════════════════════════════ */}
      <div onMouseDown={drag} style={{
        padding: "6px 18px", flexShrink: 0, cursor: "grab",
        borderTop: `1px solid ${C.border}`,
        background: "rgba(0,0,0,0.3)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: "9px", color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
          Alt+Space untuk Capture
        </span>
        <span style={{
          fontSize: "9px", fontWeight: 800, letterSpacing: "0.08em",
          color: isPinned ? C.warning : focusMode ? C.accentLight : C.textMuted,
          transition: "color 0.3s",
        }}>
          {isPinned ? "📌 PINNED" : focusMode ? "⚡ FOCUS ACTIVE" : "✦ AETHER v1.2"}
        </span>
      </div>
    </div>
  );
}

// ── SHARED STYLES ────────────────────────────────────────────
const inStyle: React.CSSProperties = {
  flex: 1, padding: "7px 10px", borderRadius: "8px",
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(99,102,241,0.3)",
  color: "#f1f5f9", fontSize: "12px", outline: "none", userSelect: "text",
  width: "100%", boxSizing: "border-box",
};
const taStyle: React.CSSProperties = {
  ...inStyle, resize: "none", lineHeight: "1.55", width: "100%", display: "block",
};
const okBtn: React.CSSProperties = {
  padding: "6px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
  cursor: "pointer", border: "none", background: "rgba(99,102,241,0.35)",
  color: "#c7d2fe", display: "flex", alignItems: "center", gap: "3px", flexShrink: 0,
};
const xBtn: React.CSSProperties = {
  padding: "6px 10px", borderRadius: "8px", fontSize: "12px",
  cursor: "pointer", border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)", color: "#475569", flexShrink: 0,
};
const editBadge: React.CSSProperties = {
  fontSize: "9.5px", padding: "1px 5px", borderRadius: "4px", background: "rgba(255,255,255,0.08)",
  color: "#94a3b8", cursor: "pointer", transition: "all 0.15s",
};
const deleteBadge: React.CSSProperties = {
  ...editBadge, background: "rgba(239,68,68,0.15)", color: "#ef4444",
};

// ── SMALL UTILITY COMPONENTS ─────────────────────────────────
function PinBtn({ pinned, onClick }: { pinned: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} onMouseDown={e => e.stopPropagation()} title={pinned ? "Lepas pin" : "Pin di atas"}
      style={{
        width: "30px", height: "30px", borderRadius: "8px", fontSize: "14px", cursor: "pointer",
        border: pinned ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.1)",
        background: pinned ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
        color: pinned ? "#fbbf24" : "#475569",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s",
        boxShadow: pinned ? "0 0 10px rgba(245,158,11,0.15)" : "none",
      }}>📌</button>
  );
}

function FocusBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} onMouseDown={e => e.stopPropagation()}
      style={{
        padding: "4px 11px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer",
        border: active ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.1)",
        background: active ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.04)",
        color: active ? "#a5b4fc" : "#475569",
        transition: "all 0.2s", letterSpacing: "0.03em",
      }}>
      {active ? "⚡ Focus" : "Focus"}
    </button>
  );
}

function SLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#334155", padding: "8px 2px 4px" }}>
      {text}
    </div>
  );
}

function AddRowBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      marginTop: "6px", padding: "7px 11px",
      borderRadius: "9px", border: "1.2px dashed rgba(99,102,241,0.22)",
      background: "transparent", color: "#3d4f6b", fontSize: "11.5px", fontWeight: 500,
      cursor: "pointer", width: "100%", textAlign: "left",
      display: "flex", alignItems: "center", gap: "6px",
      transition: "all 0.2s",
    }}>
      <span style={{ fontSize: "15px", color: "rgba(99,102,241,0.5)", lineHeight: 1 }}>+</span>
      {label}
    </button>
  );
}

function TaskRow({ task, onToggle, onDel }:
  { task: { id: number; text: string; completed: boolean }; onToggle: (id: number) => void; onDel: (id: number) => void }) {
  const [hov, setHov] = useState(false);
  const priority = getTaskPriority(task.text);

  const badgeStyle = {
    high: { bg: "rgba(239,68,68,0.14)", text: "#f87171", label: "Mendesak", border: "rgba(239,68,68,0.22)" },
    medium: { bg: "rgba(245,158,11,0.12)", text: "#fbbf24", label: "Penting", border: "rgba(245,158,11,0.22)" },
    low: { bg: "rgba(255,255,255,0.02)", text: "#94a3b8", label: "Normal", border: "rgba(255,255,255,0.06)" }
  }[priority];

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      display: "flex", alignItems: "flex-start", gap: "9px",
      padding: "8px 10px", marginBottom: "3.5px", borderRadius: "10px", position: "relative",
      background: hov ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.015)",
      border: `1.2px solid ${
        task.completed ? "rgba(255,255,255,0.03)" :
        priority === "high" ? "rgba(239,68,68,0.25)" :
        priority === "medium" ? "rgba(245,158,11,0.25)" :
        hov ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"
      }`,
      transition: "all 0.15s",
    }}>
      {/* Checkbox */}
      <div onClick={() => onToggle(task.id)} style={{
        width: "16px", height: "16px", minWidth: "16px", borderRadius: "5px", marginTop: "2px",
        border: task.completed ? "2px solid #6366f1" : "2px solid rgba(255,255,255,0.18)",
        background: task.completed ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
      }}>
        {task.completed && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Text & Priority Badge */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1, cursor: "pointer" }} onClick={() => onToggle(task.id)}>
        <span style={{
          fontSize: "12.5px", lineHeight: "1.45", wordBreak: "break-word",
          color: task.completed ? "#334155" : "#e2e8f0",
          textDecoration: task.completed ? "line-through" : "none",
          transition: "color 0.2s",
        }}>{task.text}</span>
        
        {!task.completed && (
          <div style={{ display: "flex" }}>
            <span style={{
              fontSize: "8px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px",
              background: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}`,
              letterSpacing: "0.02em", textTransform: "uppercase"
            }}>
              {badgeStyle.label}
            </span>
          </div>
        )}
      </div>

      {/* Delete */}
      {hov && (
        <button onClick={e => { e.stopPropagation(); onDel(task.id); }} style={{
          position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)",
          width: "17px", height: "17px", borderRadius: "5px",
          border: "none", background: "rgba(239,68,68,0.16)", color: "#f87171",
          fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      )}
    </div>
  );
}

function NoteCard({ note, accent, onDel }:
  { note: { id: number; text: string }; accent: string; onDel: (id: number) => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      padding: "9px 12px", borderRadius: "10px", position: "relative",
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${hov ? `rgba(${rgb(accent)},0.22)` : "rgba(255,255,255,0.05)"}`,
      transition: "border 0.2s",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg,${accent},transparent)`, borderRadius: "10px 10px 0 0" }}/>
      <p style={{ margin: 0, fontSize: "12.5px", color: "#cbd5e1", lineHeight: "1.55", wordBreak: "break-word" }}>{note.text}</p>
      {hov && (
        <button onClick={() => onDel(note.id)} style={{
          position: "absolute", right: "6px", top: "6px", width: "17px", height: "17px",
          borderRadius: "5px", border: "none", background: "rgba(239,68,68,0.16)",
          color: "#f87171", fontSize: "10px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      )}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 10px", gap: "6px" }}>
      <span style={{ fontSize: "26px" }}>{icon}</span>
      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#334155", marginTop: "2px" }}>{title}</span>
      <span style={{ fontSize: "10.5px", color: "#1e293b", textAlign: "center", lineHeight: 1.5 }}>{sub}</span>
    </div>
  );
}
