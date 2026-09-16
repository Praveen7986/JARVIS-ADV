import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronDown,
  CirclePause,
  Clock3,
  Cpu,
  ExternalLink,
  Gauge,
  Globe2,
  Headphones,
  Layers3,
  LayoutGrid,
  MessageSquare,
  Mic2,
  MoreHorizontal,
  MoveUpRight,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  TerminalSquare,
  Volume2,
  X,
  Zap,
} from "lucide-react";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type Phase = "RESTING" | "DETECTED" | "ACTIVATING" | "EXPANDING" | "PRESENTING" | "DELIVERED" | "CONTRACTING";
type SectionId = "world" | "technology" | "science" | "finance" | "projects" | "messages" | "calls" | "schedule";

type AttentionEvent = {
  id: string;
  section: SectionId;
  title: string;
  summary: string;
  source: string;
  age: string;
  priority: Priority;
  relevance: number;
  urgency: number;
  context: string;
  accent: string;
  icon: typeof Globe2;
};

const phaseOrder: Phase[] = [
  "RESTING",
  "DETECTED",
  "ACTIVATING",
  "EXPANDING",
  "PRESENTING",
  "DELIVERED",
  "CONTRACTING",
];

const sectionMeta: Record<SectionId, { label: string; short: string; icon: typeof Globe2 }> = {
  world: { label: "World", short: "Global signal", icon: Globe2 },
  technology: { label: "Technology", short: "Frontier watch", icon: Cpu },
  science: { label: "Science", short: "Research pulse", icon: Sparkles },
  finance: { label: "Finance", short: "Market context", icon: Activity },
  projects: { label: "Projects", short: "Workstream", icon: Layers3 },
  messages: { label: "Messages", short: "Communications", icon: MessageSquare },
  calls: { label: "Calls", short: "Availability", icon: Headphones },
  schedule: { label: "Schedule", short: "Time horizon", icon: CalendarDays },
};

const eventSeed: AttentionEvent[] = [
  {
    id: "tech-gpt5",
    section: "technology",
    title: "OpenAI announces GPT-5",
    summary: "OpenAI has announced GPT-5 with major gains in reasoning, multimodal capabilities, and real-time agent tools.",
    source: "The Verge / 2 min read",
    age: "just now",
    priority: "HIGH",
    relevance: 94,
    urgency: 72,
    context: "Matches your AI research watchlist",
    accent: "#74b9ff",
    icon: Cpu,
  },
  {
    id: "world-japan",
    section: "world",
    title: "Major earthquake strikes Japan",
    summary: "A 6.8 magnitude earthquake has struck off Japan's coast, prompting tsunami advisories in nearby regions.",
    source: "Reuters / 4 min read",
    age: "2 min ago",
    priority: "CRITICAL",
    relevance: 81,
    urgency: 98,
    context: "Safety signal; awaiting delivery after current briefing",
    accent: "#b79cff",
    icon: Globe2,
  },
  {
    id: "science-mars",
    section: "science",
    title: "New sample analysis from Mars",
    summary: "A new analysis suggests ancient water activity persisted longer than previous models indicated.",
    source: "Nature / 8 min read",
    age: "12 min ago",
    priority: "MEDIUM",
    relevance: 76,
    urgency: 34,
    context: "Aligned with your space briefings",
    accent: "#8fe0bd",
    icon: Sparkles,
  },
];

const priorityRank: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function scoreEvent(event: AttentionEvent) {
  return Math.round(event.relevance * 0.45 + event.urgency * 0.35 + priorityRank[event.priority] * 5);
}

function PhasePill({ phase }: { phase: Phase }) {
  const labels: Record<Phase, string> = {
    RESTING: "Resting",
    DETECTED: "Event detected",
    ACTIVATING: "Activating",
    EXPANDING: "Organic expansion",
    PRESENTING: "Presenting",
    DELIVERED: "Delivered",
    CONTRACTING: "Returning to rest",
  };
  return (
    <span className={`phase-pill phase-pill--${phase.toLowerCase()}`}>
      <span className="phase-pill__dot" />
      {labels[phase]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`priority priority--${priority.toLowerCase()}`}>{priority}</span>;
}

function WaveMark({ active }: { active: boolean }) {
  return (
    <svg className={`wave-mark ${active ? "wave-mark--active" : ""}`} viewBox="0 0 260 46" fill="none" aria-hidden="true">
      <path d="M2 31C33 31 37 31 55 31C78 31 78 7 108 7C137 7 132 31 159 31C183 31 187 31 207 31C231 31 234 21 258 21" />
    </svg>
  );
}

function SectionCard({
  section,
  active,
  currentEvent,
  phase,
  onActivate,
}: {
  section: SectionId;
  active: boolean;
  currentEvent?: AttentionEvent;
  phase: Phase;
  onActivate: (section: SectionId) => void;
}) {
  const meta = sectionMeta[section];
  const Icon = meta.icon;
  const showingContent = active && ["EXPANDING", "PRESENTING", "DELIVERED"].includes(phase);

  return (
    <button
      type="button"
      className={`section-card ${active ? "section-card--active" : ""} section-card--${phase.toLowerCase()}`}
      onClick={() => onActivate(section)}
      aria-pressed={active}
    >
      {active && <WaveMark active />}
      <div className="section-card__top">
        <div className="section-card__identity">
          <span className="section-icon"><Icon size={16} strokeWidth={1.7} /></span>
          <span>
            <strong>{meta.label}</strong>
            <small>{meta.short}</small>
          </span>
        </div>
        <div className="section-card__state">
          {active ? <PhasePill phase={phase} /> : <span className="resting-dot"><span /> Calm</span>}
          <MoreHorizontal size={16} />
        </div>
      </div>
      <div className="section-card__body">
        {showingContent && currentEvent ? (
          <div className="section-card__content">
              <div className="signal-visual" style={{ "--signal-accent": currentEvent.accent } as CSSProperties}>
              <div className="signal-grid" />
              <Icon size={32} strokeWidth={1.2} />
              <span>LIVE SIGNAL</span>
            </div>
            <div className="section-card__copy">
              <div className="section-card__eyebrow"><span>Attention surfaced</span><PriorityBadge priority={currentEvent.priority} /></div>
              <h3>{currentEvent.title}</h3>
              <p>{currentEvent.summary}</p>
              <div className="card-actions">
                <span className="read-link">Open briefing <ArrowRight size={13} /></span>
                <span className="save-link"><Star size={12} /> Watch</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="resting-copy">
            <span className="resting-time">09:24 <small>AM</small></span>
            <span className="resting-note">No new signal<br /><em>surface is calm</em></span>
          </div>
        )}
      </div>
      <div className="section-card__footer">
        <span>{active && currentEvent ? currentEvent.source : "Monitoring · context-aware"}</span>
        <span className="footer-chevron"><ChevronDown size={13} /></span>
      </div>
    </button>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="score-row">
      <div className="score-label"><span>{label}</span><strong>{value}%</strong></div>
      <div className="score-track"><span style={{ width: `${value}%`, background: color }} /></div>
    </div>
  );
}

export default function Home() {
  const [events, setEvents] = useState<AttentionEvent[]>(eventSeed);
  const [activeEventId, setActiveEventId] = useState(eventSeed[0].id);
  const [phase, setPhase] = useState<Phase>("PRESENTING");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [toast, setToast] = useState("Attention Manager is observing");
  const [activeNav, setActiveNav] = useState<SectionId>("technology");
  const [command, setCommand] = useState("");

  const activeEvent = events.find((event) => event.id === activeEventId) ?? eventSeed[0];
  const queuedEvents = events.filter((event) => event.id !== activeEventId).sort((a, b) => scoreEvent(b) - scoreEvent(a));
  const activeSection = activeEvent.section;
  const phaseIndex = phaseOrder.indexOf(phase);

  const currentReason = useMemo(() => {
    if (phase === "RESTING") return "No section currently requires interruption.";
    if (phase === "DETECTED") return "The Event Bus received a new signal.";
    if (phase === "CONTRACTING") return "Delivery complete; returning the surface to calm.";
    return activeEvent.context;
  }, [activeEvent.context, phase]);

  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const timer = window.setInterval(() => {
      setPhase((current) => {
        const index = phaseOrder.indexOf(current);
        if (index >= phaseOrder.length - 1) {
          setIsPlaying(false);
          return "RESTING";
        }
        return phaseOrder[index + 1];
      });
    }, 1050);
    return () => window.clearInterval(timer);
  }, [isPlaying, isPaused]);

  useEffect(() => {
    if (phase !== "RESTING") return;
    const timer = window.setTimeout(() => {
      const next = queuedEvents[0];
      if (next) {
        setActiveEventId(next.id);
        setActiveNav(next.section);
        setPhase("DETECTED");
        setToast(`${sectionMeta[next.section].label} promoted by priority engine`);
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [phase, queuedEvents]);

  const startSequence = () => {
    setIsPaused(false);
    setIsPlaying(true);
    setPhase("DETECTED");
    setToast("Attention Manager is sequencing the next delivery");
  };

  const resetSequence = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setActiveEventId(eventSeed[0].id);
    setActiveNav("technology");
    setPhase("RESTING");
    setToast("All sections returned to resting state");
  };

  const activateSection = (section: SectionId) => {
    const event = events.find((candidate) => candidate.section === section);
    setActiveNav(section);
    if (!event) {
      setToast(`${sectionMeta[section].label} is calm — no relevant signal in queue`);
      return;
    }
    setActiveEventId(event.id);
    setPhase("EXPANDING");
    setIsPlaying(false);
    setToast(`${sectionMeta[section].label} activated manually for inspection`);
  };

  const injectEvent = () => {
    const next: AttentionEvent = {
      id: `injected-${Date.now()}`,
      section: "projects",
      title: "DAI implementation checkpoint ready",
      summary: "The new attention surface is ready for a review of queue behavior, controls, and responsive states.",
      source: "JARVIS Projects / now",
      age: "now",
      priority: "MEDIUM",
      relevance: 88,
      urgency: 48,
      context: "Generated by the project event source",
      accent: "#f8c56f",
      icon: Layers3,
    };
    setEvents((current) => [...current, next]);
    setToast("Project event entered the Event Bus");
  };

  const submitCommand = (event: FormEvent) => {
    event.preventDefault();
    if (!command.trim()) return;
    setToast(`Command routed to Attention Manager: “${command.trim()}”`);
    setCommand("");
  };

  return (
    <main className="dai-shell">
      <div className="noise-layer" />
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-orb"><span /></div>
          <div><div className="brand-name">JARVIS</div><div className="brand-caption">DYNAMIC ATTENTION INTERFACE</div></div>
        </div>
        <div className="topbar-title"><span>DAI / PHASE ONE</span><strong>Information that moves to your attention.</strong></div>
        <div className="topbar-status">
          <span className="status-item"><span className="live-dot" /> ATTENTION MANAGER <b>ONLINE</b></span>
          <span className="status-item"><Radio size={13} /> EVENT BUS <b>SYNCED</b></span>
          <button type="button" className="round-button" aria-label="Open settings"><Settings2 size={16} /></button>
        </div>
      </header>

      <div className="app-grid">
        <aside className="left-rail">
          <div className="rail-heading"><span className="micro-label">SURFACES</span><span className="rail-count">08</span></div>
          <nav className="section-nav" aria-label="Information sections">
            {(Object.keys(sectionMeta) as SectionId[]).map((section) => {
              const meta = sectionMeta[section];
              const Icon = meta.icon;
              const isSelected = activeNav === section;
              const hasEvent = events.some((event) => event.section === section);
              return (
                <button key={section} type="button" className={`nav-item ${isSelected ? "nav-item--active" : ""}`} onClick={() => activateSection(section)}>
                  <Icon size={16} strokeWidth={1.7} /><span>{meta.label}</span>{hasEvent && <i className="nav-signal" />}
                </button>
              );
            })}
          </nav>
          <div className="rail-bottom">
            <div className="rail-heading"><span className="micro-label">SYSTEM HEALTH</span><Activity size={14} /></div>
            <div className="health-card"><div className="health-card__top"><span>Personal world model</span><strong>98%</strong></div><div className="health-track"><span /></div><div className="health-card__foot"><span>Context aligned</span><span className="health-live"><i /> LIVE</span></div></div>
            <button type="button" className="rail-link" onClick={() => setToast("Attention policies are configured for context-aware delivery")}><BrainCircuit size={15} /> Attention policies <ArrowRight size={13} /></button>
          </div>
        </aside>

        <section className="main-stage">
          <div className="stage-head">
            <div><div className="eyebrow"><span className="eyebrow-line" /> CORE VISUAL-INTERACTION LAYER</div><h1>A living surface for <em>what matters.</em></h1><p>JARVIS monitors incoming signals, evaluates their importance, then lets only the right section emerge.</p></div>
            <div className="stage-actions"><div className="surface-state"><span className="live-dot" /> <span>CALM / READY</span></div><button type="button" className="icon-button" onClick={resetSequence} aria-label="Reset sequence"><RotateCcw size={16} /></button></div>
          </div>

          <div className="attention-banner">
            <div className="attention-banner__icon"><Zap size={17} /></div><div><span className="micro-label">CURRENT ATTENTION STATE</span><strong>{toast}</strong></div><div className="banner-phase"><PhasePill phase={phase} /></div>
          </div>

          <div className="section-grid">
            {(Object.keys(sectionMeta) as SectionId[]).map((section) => (
              <SectionCard key={section} section={section} active={section === activeSection} currentEvent={activeEvent} phase={phase} onActivate={activateSection} />
            ))}
          </div>

          <div className="bottom-command-row">
            <form className="command-bar" onSubmit={submitCommand}><span className="command-icon"><TerminalSquare size={16} /></span><input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Ask JARVIS to reprioritize, brief, or dismiss…" aria-label="Command JARVIS" /><button type="submit" aria-label="Send command"><Send size={15} /></button></form>
            <button type="button" className={`sequence-button ${isPlaying ? "sequence-button--playing" : ""}`} onClick={isPlaying ? () => setIsPaused((paused) => !paused) : startSequence}>{isPlaying && !isPaused ? <Pause size={14} /> : <Play size={14} />}{isPlaying ? (isPaused ? "Resume sequence" : "Pause sequence") : "Run next event"}</button>
          </div>
        </section>

        <aside className="right-rail">
          <div className="right-rail__header"><div><span className="micro-label">ATTENTION MANAGER</span><h2>Priority queue</h2></div><span className="queue-count">{String(events.length).padStart(2, "0")}</span></div>
          <div className="queue-list">
            <div className="queue-label"><span>NOW PRESENTING</span><span>PRIORITY</span></div>
            <div className="now-card"><div className="now-card__top"><span className="now-section">{(() => { const ActiveIcon = activeEvent.icon; return <ActiveIcon size={15} />; })()} {sectionMeta[activeEvent.section].label}</span><PriorityBadge priority={activeEvent.priority} /></div><strong>{activeEvent.title}</strong><span className="now-card__source">{activeEvent.source}</span><div className="delivery-progress"><span style={{ width: `${Math.max(12, ((phaseIndex + 1) / phaseOrder.length) * 100)}%` }} /></div><div className="delivery-meta"><span>Delivery sequence</span><b>{phaseIndex + 1} / {phaseOrder.length}</b></div></div>
            <div className="queue-label queue-label--later"><span>UP NEXT</span><span>{queuedEvents.length} WAITING</span></div>
            {queuedEvents.map((event, index) => { const Icon = event.icon; return <button key={event.id} type="button" className="queue-item" onClick={() => { setActiveEventId(event.id); setActiveNav(event.section); setPhase("DETECTED"); setToast(`${sectionMeta[event.section].label} moved to the front of the queue`); }}><span className="queue-number">0{index + 1}</span><span className="queue-item__icon"><Icon size={15} /></span><span className="queue-item__copy"><strong>{event.title}</strong><small>{sectionMeta[event.section].label} · {event.age}</small></span><PriorityBadge priority={event.priority} /><ArrowRight size={14} /></button>; })}
          </div>

          <div className="presentation-panel"><div className="right-rail__header presentation-heading"><div><span className="micro-label">PRESENTATION ENGINE</span><h2>Delivery controls</h2></div><Volume2 size={16} className={isMuted ? "muted" : ""} /></div><div className="voice-transcript"><span className="transcript-mark">J</span><p>“{activeEvent.summary}”</p></div><div className="control-row"><button type="button" className="control-button control-button--primary" onClick={() => setIsPaused((paused) => !paused)}><CirclePause size={14} /> {isPaused ? "Resume" : "Pause"}</button><button type="button" className="control-button" onClick={() => setIsMuted((muted) => !muted)}><Volume2 size={14} /> {isMuted ? "Unmute" : "Mute"}</button><button type="button" className="control-button" onClick={() => { setPhase("RESTING"); setToast("Current delivery dismissed; queue remains intact"); }}><X size={14} /> Dismiss</button></div><div className="why-card"><div className="why-card__title"><Gauge size={14} /> WHY THIS APPEARED <button type="button" aria-label="More about prioritization"><MoreHorizontal size={14} /></button></div><p>{currentReason}</p><div className="scores"><ScoreBar label="Relevance" value={activeEvent.relevance} color="#72b9ff" /><ScoreBar label="Urgency" value={activeEvent.urgency} color="#f7c66f" /></div></div></div>

          <div className="event-bus"><div className="micro-label">EVENT BUS / LIVE TRACE</div><div className="bus-line"><span className="bus-node bus-node--done"><Check size={11} /></span><span className="bus-connector" /><span className="bus-node bus-node--done"><BrainCircuit size={11} /></span><span className="bus-connector" /><span className="bus-node bus-node--active"><Zap size={11} /></span><span className="bus-connector" /><span className="bus-node"><LayoutGrid size={11} /></span></div><div className="bus-labels"><span>DETECT</span><span>ANALYZE</span><span>PRIORITIZE</span><span>ACT</span></div><div className="bus-foot"><span><span className="live-dot" /> 3 events evaluated</span><span>Interrupt-safe</span></div></div>
        </aside>
      </div>

      <footer className="footer-bar"><div><ShieldCheck size={14} /> <span>CONTEXT-AWARE</span><small>No competing interruptions</small></div><div><Layers3 size={14} /> <span>QUEUE-AWARE</span><small>One section at a time</small></div><div><MoveUpRight size={14} /> <span>EXTENSIBLE</span><small>Desktop · mobile · AR</small></div><div className="footer-quote">“Information moves to your attention.” <span>— JARVIS</span></div><button type="button" onClick={injectEvent} className="inject-button"><Bell size={13} /> Inject project event</button></footer>
    </main>
  );
}
