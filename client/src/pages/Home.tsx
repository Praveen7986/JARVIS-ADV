import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Activity, MapPin, Sparkles, ShieldCheck, Image as ImageIcon, Video, MessageSquare, ExternalLink, Play, Layers, Mail, Bell, Volume2, Brain, Cpu } from "lucide-react";
import { DaiDeck, DaiDeckBriefing, PRESET_DAI_DECKS } from "@/components/DaiDeck";

const DAI_EVENT_NAME = "jarvis:news-event";

type DaiImportance = "low" | "medium" | "high" | "critical";
type DaiPhase =
  | "JARVIS_IDLE"
  | "JARVIS_WORKING"
  | "JARVIS_SPEAKING"
  | "JARVIS_EXECUTING"
  | "DAI_PENDING"
  | "DAI_INTERRUPT_REQUESTED"
  | "JARVIS_PAUSING"
  | "DAI_ACTIVE"
  | "DAI_PRESENTING"
  | "DAI_COMPLETING"
  | "DAI_RETURNING"
  | "JARVIS_RESTORING"
  | "JARVIS_RESUMED"
  | "WAITING_FOR_USER";

const WELCOME_SPEECH =
  "Welcome. I am JARVIS, your personal assistant. Is there anything for me to do, or what about your day and your plans?";

interface JarvisOrbProps {
  active: boolean;
  speaking: boolean;
  level: number;
  bass: number;
  treble: number;
}

export function JarvisOrb({ active, speaking, level, bass, treble }: JarvisOrbProps) {
  return (
    <div
      className={`jarvis-orb ${active ? "jarvis-orb--active" : ""} ${speaking ? "jarvis-orb--speaking" : ""}`}
      style={{
        ["--voice-level" as any]: level.toFixed(3),
        ["--voice-bass" as any]: bass.toFixed(3),
        ["--voice-treble" as any]: treble.toFixed(3),
      }}
      aria-label="JARVIS holographic visualizer"
      role="img"
    >
      <div className="orb-shadow" />
      <div className="orb-halo orb-halo--outer" />
      <div className="orb-halo orb-halo--inner" />
      <div className="orb-rings">
        {Array.from({ length: 15 }).map((_, i) => (
          <span key={i} className="orb-ring" style={{ ["--i" as any]: i }} />
        ))}
      </div>
      <div className="orb-grid orb-grid--vertical" />
      <div className="orb-grid orb-grid--horizontal" />
      <div className="orb-core">
        <div className="orb-core-lens" />
        <div className="orb-core-pulse" />
      </div>
      <div className="orb-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} style={{ ["--i" as any]: i }} />
        ))}
      </div>
      <div className="orb-scanline" />
    </div>
  );
}

export interface TopicImageItem {
  id?: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  source?: string;
}

export interface TopicVideoItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  platform: "YouTube" | "Vimeo" | "TED" | "TechStream";
  channel: string;
  duration: string;
  views?: string;
}

export interface TopicSocialItem {
  id: string;
  title: string;
  url: string;
  platform: "X / Twitter" | "Reddit" | "Hacker News" | "GitHub";
  author: string;
  snippet: string;
  metrics?: string;
}

export interface TopicMediaCollection {
  images: TopicImageItem[];
  videos: TopicVideoItem[];
  socialMedia: TopicSocialItem[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  topicImages?: TopicImageItem[];
  topicMedia?: TopicMediaCollection;
}

interface NewsArticle {
  title: string;
  link: string;
  source: string;
}

interface SourceLink {
  title: string;
  url: string;
  source: string;
}

interface DaiNewsEvent {
  id: string;
  category: string;
  importance: DaiImportance;
  relevance: "low" | "medium" | "high";
  title: string;
  source: string;
  timestamp: string;
  summary: string;
  whyItMatters: string;
  link?: string;
}

interface DaiInterruptContext {
  currentConversation: ChatMessage[];
  currentUserRequest: string;
  currentTask: string;
  currentTaskProgress: string;
  currentSentence: string;
  currentSentencePosition: number;
  currentApplication: string;
  currentWorkflowStep: string;
  currentToolExecutionState: string;
  currentResearchState: string;
  currentUIState: string;
  currentVoiceState: "speaking" | "listening" | "idle";
  pendingActions: string[];
  pendingQuestions: string[];
  capturedAt: string;
}

const DAI_IMPORTANCE_RANK: Record<DaiImportance, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const DAI_ACTIVE_PHASES: DaiPhase[] = [
  "DAI_PENDING",
  "DAI_INTERRUPT_REQUESTED",
  "JARVIS_PAUSING",
  "DAI_ACTIVE",
  "DAI_PRESENTING",
  "DAI_COMPLETING",
  "DAI_RETURNING",
  "JARVIS_RESTORING",
  "WAITING_FOR_USER",
];

const DAI_CATEGORIES = [
  "World",
  "Technology",
  "Science",
  "Finance",
  "Projects",
  "Messages",
  "Calls",
] as const;

const SAMPLE_DAI_EVENTS: Record<string, Partial<DaiNewsEvent>> = {
  World: {
    category: "World",
    importance: "high",
    relevance: "high",
    title: "Global Clean Energy Accord Signed in Geneva",
    source: "Reuters / UN Press",
    summary: "Representatives from 140 nations have ratified a fast-track clean energy corridor initiative with immediate funding allocations.",
    whyItMatters: "Directly impacts international power infrastructure regulations and green energy venture capital timelines.",
    link: "https://reuters.com",
  },
  Technology: {
    category: "Technology",
    importance: "high",
    relevance: "high",
    title: "OpenAI Unveils GPT-5 Architecture with Native Agentic Loops",
    source: "TechCrunch / OpenAI",
    summary: "OpenAI announced next-generation foundation models featuring sub-10ms audio reasoning, multi-step tool verification, and verified memory persistence.",
    whyItMatters: "Enables near-zero latency interruption handling and autonomous multi-agent pipelines for JARVIS MAN1.",
    link: "https://techcrunch.com",
  },
  Science: {
    category: "Science",
    importance: "high",
    relevance: "high",
    title: "James Webb Telescope Detects Atmospheric Water on Terrestrial Exoplanet",
    source: "NASA / Nature Astronomy",
    summary: "JWST spectrometers confirmed unambiguous water vapor and carbon signatures in the habitable zone of TRAPPIST-1e.",
    whyItMatters: "Represents the strongest spectroscopic evidence of habitable exoplanetary atmosphere to date.",
    link: "https://nasa.gov",
  },
  Finance: {
    category: "Finance",
    importance: "high",
    relevance: "high",
    title: "Federal Reserve Announces 50bps Rate Cut Amid Inflation Stabilization",
    source: "Bloomberg / Fed Wire",
    summary: "The FOMC unanimously lowered the benchmark federal funds rate, easing credit conditions for high-growth tech investments.",
    whyItMatters: "Improves liquidity across technology portfolios and accelerates venture capital deployment.",
    link: "https://bloomberg.com",
  },
  Projects: {
    category: "Projects",
    importance: "high",
    relevance: "high",
    title: "Project Alpha CI Pipeline Succeeded & Production Artifact Deployed",
    source: "GitHub Actions / DevAgent",
    summary: "All 18 automated integration tests and security audits passed. Production container v2.4.0 is now live.",
    whyItMatters: "Resolves the pending blocking release milestone ahead of the scheduled executive demo.",
  },
  Messages: {
    category: "Messages",
    importance: "high",
    relevance: "high",
    title: "Priority DM from Elena Vance: Critical Partnership Term Sheet",
    source: "Instagram DM / MAN1 Ingestion",
    summary: "Elena Vance (Founding Partner, 850k followers) sent revised term sheet for the upcoming brand collaboration.",
    whyItMatters: "Awaiting your human-in-the-loop review in the MAN1 Approvals Queue.",
  },
  Calls: {
    category: "Calls",
    importance: "critical",
    relevance: "high",
    title: "Incoming High-Priority Telemetry Call from Dr. Aris Thorne",
    source: "Secure Comms Relay",
    summary: "Encrypted voice channel request flagged with emergency priority regarding data center cooling anomaly.",
    whyItMatters: "Requires immediate real-time voice handshake or route to emergency voicemail delegate.",
  },
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const [bass, setBass] = useState(0);
  const [treble, setTreble] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [showWakePrompt, setShowWakePrompt] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[] | null>(null);
  const [showNewsBriefing, setShowNewsBriefing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Camera gestures off");
  const [screenActive, setScreenActive] = useState(false);
  const [screenStatus, setScreenStatus] = useState("Screen access off");
  const [sourceLinks, setSourceLinks] = useState<SourceLink[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<ChatMessage | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<"all" | "images" | "videos" | "social">("all");
  const [daiPhase, setDaiPhase] = useState<DaiPhase>("JARVIS_IDLE");
  const [daiEvent, setDaiEvent] = useState<DaiNewsEvent | null>(null);
  const [daiDeck, setActiveDaiDeck] = useState<DaiDeckBriefing | null>(null);
  const [daiQueue, setDaiQueue] = useState<DaiNewsEvent[]>([]);
  const [daiContext, setDaiContext] = useState<DaiInterruptContext | null>(null);
  const [daiNotice, setDaiNotice] = useState("");
  const [liveMan1Alert, setLiveMan1Alert] = useState<{ id: string; title: string; sender: string; type: string } | null>(null);
  const lastProcessedEventIdRef = useRef<string | null>(null);

  const quickPrompts = [
    { label: "🧠 AI Builder", query: "Create an AI model that understands Telugu and English, use my dataset from the AI folder, fine-tune an appropriate open model, test it, and save everything in my Projects folder." },
    { label: "⚡ Training Progress", query: "Show me the current AI model training progress and loss curves." },
    { label: "🔥 Real-Time News", query: "What is the hot topic news today?" },
    { label: "💻 Tech Headlines", query: "What are today's tech news headlines?" },
    { label: "🚀 Science & Space", query: "What is the latest science and space news?" },
  ];

  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isPendingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const transcriptBufferRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  const speechTimeoutRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const captionScrollRef = useRef<HTMLDivElement | null>(null);
  const captionEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dynamicsRef = useRef({ level: 0, bass: 0, treble: 0 });

  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenActiveRef = useRef(false);
  const screenAutoAnalyzedRef = useRef(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraAnimRef = useRef<number | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const lastGestureTimeRef = useRef(0);
  const prevMsgCountRef = useRef(0);
  const daiPhaseRef = useRef<DaiPhase>("JARVIS_IDLE");
  const daiQueueRef = useRef<DaiNewsEvent[]>([]);
  const daiEventRef = useRef<DaiNewsEvent | null>(null);
  const daiContextRef = useRef<DaiInterruptContext | null>(null);
  const daiCompletionTimerRef = useRef<number | null>(null);
  const daiResumeTimerRef = useRef<number | null>(null);
  const daiResumeAfterSpeechRef = useRef(false);
  const daiSpeechWasInterruptedRef = useRef(false);
  const daiSpeechSourceRef = useRef("");
  const daiSpeechPositionRef = useRef(0);
  const daiSpeechKindRef = useRef<"normal" | "presentation" | "return">("normal");
  const daiDeferredReplyRef = useRef("");

  const chatMutation = trpc.jarvis.chat.useMutation();
  const isPending = chatMutation.isPending;

  // Poll MAN-1 live events in the background every 15s to notify user of incoming emails/git events in real time
  const man1EventsQuery = trpc.man1.getLiveEvents.useQuery(undefined, {
    refetchInterval: 15000,
    retry: false,
  });

  useEffect(() => {
    const events = man1EventsQuery.data;
    if (events && events.length > 0) {
      const newest = events[0];
      if (lastProcessedEventIdRef.current === null) {
        lastProcessedEventIdRef.current = newest.event_id;
      } else if (lastProcessedEventIdRef.current !== newest.event_id) {
        lastProcessedEventIdRef.current = newest.event_id;
        const sender = newest.actor?.name || newest.actor?.handleOrEmail || "System";
        const title = newest.content?.title || newest.content?.text?.slice(0, 50) || "New notification";
        setLiveMan1Alert({
          id: newest.event_id,
          title,
          sender,
          type: newest.event_type,
        });

        // Speak proactive notification if not speaking
        if (!isSpeakingRef.current && !isPendingRef.current) {
          const announcement = newest.source === "EMAIL"
            ? `Sir, you have received a new priority email from ${sender}: ${title}`
            : newest.source === "GITHUB"
            ? `Sir, new GitHub activity detected: ${title} by ${sender}`
            : `Sir, you have received a new update from ${sender}: ${title}`;
          speakText(announcement, false);
        }
      }
    }
  }, [man1EventsQuery.data]);

  // Proactive 20-minute real-time news briefing pop-up scheduler
  useEffect(() => {
    const TWENTY_MINUTES_MS = 20 * 60 * 1000;
    const newsTimer = setInterval(async () => {
      try {
        const history = [{ role: "user" as const, content: "Give me the latest breaking news headlines with sources." }];
        const response = await chatMutation.mutateAsync({ messages: history });
        if (response.newsArticles && response.newsArticles.length > 0) {
          setNewsArticles(response.newsArticles);
          setShowNewsBriefing(true);
          if (!isSpeakingRef.current && !isPendingRef.current) {
            speakText(response.reply, true);
          }
        }
      } catch (err) {
        console.warn("[JARVIS] 20-minute proactive news refresh error:", err);
      }
    }, TWENTY_MINUTES_MS);

    return () => clearInterval(newsTimer);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  const stopMicrophone = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    analyserRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
  };

  const startMicrophone = async () => {
    if (!analyserRef.current && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        ctx.createMediaStreamSource(stream).connect(analyser);
        mediaStreamRef.current = stream;
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
      } catch {}
    }
  };

  const transitionDai = (nextPhase: DaiPhase) => {
    daiPhaseRef.current = nextPhase;
    setDaiPhase(nextPhase);
  };

  const createDaiContext = (): DaiInterruptContext => {
    const lastUserRequest = [...messagesRef.current].reverse().find((message) => message.role === "user");
    const latestAssistant = [...messagesRef.current].reverse().find((message) => message.role === "assistant");
    const currentTask = isPendingRef.current
      ? "JARVIS is completing the current request"
      : isSpeakingRef.current
      ? "JARVIS is presenting the current response"
      : isListeningRef.current
      ? "JARVIS is listening for the next instruction"
      : "JARVIS is idle";
    return {
      currentConversation: messagesRef.current,
      currentUserRequest: lastUserRequest?.content ?? "",
      currentTask,
      currentTaskProgress: isPendingRef.current ? "Backend response is still in flight" : "Response is available in the conversation",
      currentSentence: daiSpeechSourceRef.current || latestAssistant?.content || "",
      currentSentencePosition: daiSpeechPositionRef.current,
      currentApplication: "JARVIS interface",
      currentWorkflowStep: currentTask,
      currentToolExecutionState: isPendingRef.current ? "ACTIVE_NON_DESTRUCTIVE_OPERATION" : "IDLE",
      currentResearchState: "Preserved in the conversation context",
      currentUIState: `input=${isInputFocused ? "focused" : "idle"}`,
      currentVoiceState: isSpeakingRef.current ? "speaking" : isListeningRef.current ? "listening" : "idle",
      pendingActions: [],
      pendingQuestions: [],
      capturedAt: new Date().toISOString(),
    };
  };

  const normalizeDaiEvent = (event: Partial<DaiNewsEvent>): DaiNewsEvent => ({
    id: event.id || `dai-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category: event.category || "technology",
    importance: event.importance || "high",
    relevance: event.relevance || "high",
    title: event.title || "An important update has arrived",
    source: event.source || "JARVIS News Engine",
    timestamp: event.timestamp || new Date().toISOString(),
    summary: event.summary || "A significant event has been detected and is ready for a short briefing.",
    whyItMatters: event.whyItMatters || "This event was selected because it may be relevant to your current priorities.",
    link: event.link,
  });

  const queueDaiEvent = (event: DaiNewsEvent) => {
    const nextQueue = [...daiQueueRef.current, event]
      .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
      .sort((a, b) => DAI_IMPORTANCE_RANK[b.importance] - DAI_IMPORTANCE_RANK[a.importance]);
    daiQueueRef.current = nextQueue;
    setDaiQueue(nextQueue);
  };

  const completeDai = () => {
    if (daiCompletionTimerRef.current) window.clearTimeout(daiCompletionTimerRef.current);
    transitionDai("DAI_COMPLETING");
    daiCompletionTimerRef.current = window.setTimeout(() => {
      transitionDai("DAI_RETURNING");
      daiCompletionTimerRef.current = window.setTimeout(() => {
        const context = daiContextRef.current;
        const hadInterruptedTask = Boolean(
          context && (context.currentTask !== "JARVIS is idle" || context.currentConversation.length > 0)
        );
        transitionDai(hadInterruptedTask ? "JARVIS_RESTORING" : "JARVIS_RESUMED");
        setDaiNotice(hadInterruptedTask ? "Previous context restored" : "DAI interruption complete");
        if (hadInterruptedTask) {
          transitionDai("WAITING_FOR_USER");
          speakText("That's the latest update. Shall I continue where I left off?", false, "return");
        } else {
          setDaiEvent(null);
          daiEventRef.current = null;
          daiContextRef.current = null;
          setDaiContext(null);
          transitionDai("JARVIS_IDLE");
        }
      }, 420);
    }, 620);
  };

  const presentDai = (event: DaiNewsEvent) => {
    daiEventRef.current = event;
    setDaiEvent(event);
    transitionDai("DAI_ACTIVE");
    daiResumeTimerRef.current = window.setTimeout(() => {
      transitionDai("DAI_PRESENTING");
      const briefing = `Sir, there's an important ${event.category} update. ${event.title}. ${event.summary} ${event.whyItMatters} That's the update.`;
      speakText(briefing, false, "presentation");
    }, 260);
  };

  const requestDaiInterruption = (rawEvent: Partial<DaiNewsEvent>) => {
    const event = normalizeDaiEvent(rawEvent);
    const activeDai = DAI_ACTIVE_PHASES.includes(daiPhaseRef.current);
    if (activeDai || daiEventRef.current) {
      queueDaiEvent(event);
      setDaiNotice("Another update was queued while DAI was active");
      return;
    }

    const isBusy = isPendingRef.current || isSpeakingRef.current || isListeningRef.current || messagesRef.current.length > 0;
    const shouldInterrupt =
      event.importance === "critical" || event.importance === "high" || (event.importance === "medium" && !isBusy);
    if (!shouldInterrupt) {
      queueDaiEvent(event);
      setDaiNotice(`${event.importance.toUpperCase()} update queued for a safe moment`);
      return;
    }

    transitionDai("DAI_PENDING");
    const context = createDaiContext();
    daiContextRef.current = context;
    setDaiContext(context);
    setDaiNotice("One moment, sir. Something important just came in.");
    transitionDai("DAI_INTERRUPT_REQUESTED");

    if (isSpeakingRef.current && "speechSynthesis" in window) {
      daiSpeechWasInterruptedRef.current = true;
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
      isListeningRef.current = false;
      setIsListening(false);
    }

    transitionDai("JARVIS_PAUSING");
    window.setTimeout(() => presentDai(event), isPendingRef.current ? 180 : 80);
  };

  const resumePausedTask = () => {
    const context = daiContextRef.current;
    if (!context) {
      transitionDai("JARVIS_IDLE");
      setDaiNotice("");
      return;
    }
    transitionDai("JARVIS_RESTORING");
    setDaiNotice("Restoring the exact task context...");
    if ("speechSynthesis" in window && isSpeakingRef.current) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      isSpeakingRef.current = false;
      setIsSpeaking(false);
    }
    const remaining =
      daiSpeechWasInterruptedRef.current && context.currentSentence
        ? context.currentSentence.slice(Math.max(0, context.currentSentencePosition))
        : "";
    daiEventRef.current = null;
    setDaiEvent(null);
    setDaiContext(null);
    daiContextRef.current = null;
    daiSpeechWasInterruptedRef.current = false;
    window.setTimeout(() => {
      transitionDai("JARVIS_RESUMED");
      setDaiNotice("JARVIS resumed from the saved context");
      if (daiDeferredReplyRef.current.trim()) {
        const deferredReply = daiDeferredReplyRef.current;
        daiDeferredReplyRef.current = "";
        speakText(`Continuing the saved task. ${deferredReply}`, true, "normal");
      } else if (remaining.trim()) {
        speakText(`Continuing from where I left off. ${remaining}`, true, "normal");
      } else if (!isPendingRef.current) {
        void startListening();
      }
      const nextEvent = daiQueueRef.current.shift();
      setDaiQueue([...daiQueueRef.current]);
      if (nextEvent) window.setTimeout(() => requestDaiInterruption(nextEvent), 700);
    }, 420);
  };

  useEffect(() => {
    const onDaiEvent = (event: Event) => {
      const detail = (event as CustomEvent<Partial<DaiNewsEvent>>).detail;
      if (detail) requestDaiInterruption(detail);
    };
    const jarvisWindow = window as Window & {
      jarvisDAI?: { interrupt: (event: Partial<DaiNewsEvent>) => void };
    };
    jarvisWindow.jarvisDAI = { interrupt: requestDaiInterruption };
    window.addEventListener(DAI_EVENT_NAME, onDaiEvent);
    return () => {
      window.removeEventListener(DAI_EVENT_NAME, onDaiEvent);
      delete jarvisWindow.jarvisDAI;
    };
  }, []);

  useEffect(() => {
    const dataArray = new Uint8Array(128);
    const updateAudioMeter = () => {
      if (isListeningRef.current && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let bassSum = 0;
        for (let i = 1; i <= 8; i++) bassSum += dataArray[i];
        const bassVal = Math.min(1, (bassSum / 2040) * 2.2);

        let trebleSum = 0;
        for (let i = 16; i <= 48; i++) trebleSum += dataArray[i];
        const trebleVal = Math.min(1, (trebleSum / 8160) * 2.5);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const levelVal = Math.min(1, (avg / 255) * 3.2);

        setLevel((prev) => prev * 0.4 + levelVal * 0.6);
        setBass((prev) => prev * 0.4 + bassVal * 0.6);
        setTreble((prev) => prev * 0.4 + trebleVal * 0.6);
      } else if (isSpeakingRef.current) {
        const now = performance.now();
        const baseLevel = dynamicsRef.current.level;
        const w1 = Math.sin(now / 85) * 0.28;
        const w2 = Math.sin(now / 145) * 0.22;
        const w3 = Math.cos(now / 48) * 0.16;
        const dynamicLevel = Math.max(0, Math.min(1, baseLevel + w1 + w2 + w3));
        const dynamicBass = Math.max(0, Math.min(1, dynamicLevel * 0.85 + Math.sin(now / 110) * 0.2));
        const dynamicTreble = Math.max(0, Math.min(1, dynamicLevel * 0.95 + Math.cos(now / 60) * 0.25));
        setLevel(dynamicLevel);
        setBass(dynamicBass);
        setTreble(dynamicTreble);
      } else {
        setLevel((p) => (p > 0.01 ? p * 0.85 : 0));
        setBass((p) => (p > 0.01 ? p * 0.85 : 0));
        setTreble((p) => (p > 0.01 ? p * 0.85 : 0));
      }
      animFrameRef.current = requestAnimationFrame(updateAudioMeter);
    };

    animFrameRef.current = requestAnimationFrame(updateAudioMeter);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (messages.length === prevMsgCountRef.current) return;
    prevMsgCountRef.current = messages.length;
    const frame = requestAnimationFrame(() => {
      captionScrollRef.current?.scrollTo({
        top: captionScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages.length]);

  const speakText = (
    text: string,
    restartListening = true,
    kind: "normal" | "presentation" | "return" = "normal"
  ) => {
    daiSpeechSourceRef.current = text;
    daiSpeechPositionRef.current = 0;
    daiSpeechKindRef.current = kind;
    if (!("speechSynthesis" in window)) {
      if (kind === "presentation") completeDai();
      else if (restartListening) setTimeout(() => void startListening(), 400);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice =
      voices.find((v) => /Google UK English Male|Microsoft George|Daniel|Oliver/i.test(v.name)) ||
      voices.find((v) => /en-GB/i.test(v.lang) && /male/i.test(v.name)) ||
      voices.find((v) => /en-GB/i.test(v.lang)) ||
      voices.find((v) => /en-US/i.test(v.lang)) ||
      voices[0];

    if (jarvisVoice) utterance.voice = jarvisVoice;
    utterance.rate = 0.98;
    utterance.pitch = 0.88;
    utterance.volume = 1;

    utterance.onboundary = (event) => {
      daiSpeechPositionRef.current = event.charIndex || daiSpeechPositionRef.current;
      dynamicsRef.current = {
        level: 0.55 + Math.random() * 0.35,
        bass: 0.45 + Math.random() * 0.4,
        treble: 0.5 + Math.random() * 0.35,
      };
    };

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      setShowWakePrompt(false);
      dynamicsRef.current = { level: 0.65, bass: 0.6, treble: 0.55 };
    };

    const handleEnd = () => {
      const completedKind = daiSpeechKindRef.current;
      const wasDaiPause = daiPhaseRef.current === "DAI_INTERRUPT_REQUESTED" || daiPhaseRef.current === "JARVIS_PAUSING";
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      dynamicsRef.current = { level: 0, bass: 0, treble: 0 };
      utteranceRef.current = null;
      if (completedKind === "presentation") {
        completeDai();
      } else if (completedKind === "return" && daiPhaseRef.current === "WAITING_FOR_USER") {
        window.setTimeout(() => {
          if (daiPhaseRef.current === "WAITING_FOR_USER" && !isSpeakingRef.current) void startListening();
        }, 350);
      } else if (completedKind !== "return" && restartListening && !wasDaiPause) {
        window.setTimeout(() => {
          if (
            !isSpeakingRef.current &&
            !isPendingRef.current &&
            (daiPhaseRef.current === "JARVIS_RESUMED" || daiPhaseRef.current === "JARVIS_IDLE")
          ) {
            void startListening();
          }
        }, 350);
      }
    };

    utterance.onend = handleEnd;
    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      handleEnd();
    };

    window.setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Autoplay blocked:", e);
        setShowWakePrompt(true);
      }
    }, 40);
  };

  const speakWithCallback = (text: string, onEnd?: () => void) => {
    daiSpeechSourceRef.current = text;
    daiSpeechPositionRef.current = 0;
    daiSpeechKindRef.current = "presentation";
    if (!("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice =
      voices.find((v) => /Google UK English Male|Microsoft George|Daniel|Oliver/i.test(v.name)) ||
      voices.find((v) => /en-GB/i.test(v.lang) && /male/i.test(v.name)) ||
      voices.find((v) => /en-GB/i.test(v.lang)) ||
      voices.find((v) => /en-US/i.test(v.lang)) ||
      voices[0];

    if (jarvisVoice) utterance.voice = jarvisVoice;
    utterance.rate = 0.98;
    utterance.pitch = 0.88;
    utterance.volume = 1;

    utterance.onboundary = (event) => {
      daiSpeechPositionRef.current = event.charIndex || daiSpeechPositionRef.current;
      dynamicsRef.current = {
        level: 0.55 + Math.random() * 0.35,
        bass: 0.45 + Math.random() * 0.4,
        treble: 0.5 + Math.random() * 0.35,
      };
    };

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      setShowWakePrompt(false);
      dynamicsRef.current = { level: 0.65, bass: 0.6, treble: 0.55 };
    };

    let called = false;
    const handleEnd = () => {
      if (called) return;
      called = true;
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      dynamicsRef.current = { level: 0, bass: 0, treble: 0 };
      utteranceRef.current = null;
      if (onEnd) onEnd();
    };

    utterance.onend = handleEnd;
    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      handleEnd();
    };

    window.setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Autoplay blocked:", e);
        handleEnd();
      }
    }, 40);
  };

  const stopSpeech = () => {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    dynamicsRef.current = { level: 0, bass: 0, treble: 0 };
    utteranceRef.current = null;
  };

  const triggerDaiDeck = (deck: DaiDeckBriefing) => {
    transitionDai("DAI_PENDING");
    const context = createDaiContext();
    daiContextRef.current = context;
    setDaiContext(context);
    setDaiNotice(`One moment, sir. Presenting: ${deck.topicTitle}`);
    transitionDai("DAI_INTERRUPT_REQUESTED");

    if (isSpeakingRef.current && "speechSynthesis" in window) {
      daiSpeechWasInterruptedRef.current = true;
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
      isListeningRef.current = false;
      setIsListening(false);
    }

    transitionDai("JARVIS_PAUSING");
    window.setTimeout(() => {
      setActiveDaiDeck(deck);
      transitionDai("DAI_PRESENTING");
    }, 150);
  };

  const handleCloseDaiDeck = () => {
    stopSpeech();
    setActiveDaiDeck(null);
    const context = daiContextRef.current;
    const hadInterruptedTask = Boolean(
      context && (context.currentTask !== "JARVIS is idle" || context.currentConversation.length > 0)
    );
    if (hadInterruptedTask) {
      transitionDai("WAITING_FOR_USER");
      setDaiNotice("Previous context preserved. Ready to resume.");
      speakText("DAI briefing closed. Shall I continue where I left off?", false, "return");
    } else {
      transitionDai("JARVIS_IDLE");
      setDaiNotice("");
      daiEventRef.current = null;
      setDaiEvent(null);
      setDaiContext(null);
      daiContextRef.current = null;
    }
  };

  const handleDaiAction = (actionLabel: string, url?: string) => {
    if (url) {
      window.open(url, "_blank");
      speakText(`Opening ${actionLabel} for you right away, boss.`, false);
    }
  };

  const captureScreenFrame = () => {
    const video = screenVideoRef.current;
    if (
      !screenActiveRef.current ||
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      return undefined;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 960 / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setScreenStatus("Screen frame captured. JARVIS is inspecting it.");
    return canvas.toDataURL("image/jpeg", 0.58);
  };

  const handleSendMessage = async (
    query: string,
    options: { showUserMessage?: boolean; screenAutoAnalyze?: boolean } = {}
  ) => {
    const text = query.trim();
    if (!text || isPendingRef.current) return;

    if (DAI_ACTIVE_PHASES.includes(daiPhaseRef.current) && daiPhaseRef.current !== "WAITING_FOR_USER") {
      setDaiNotice("DAI is presenting the update. Your previous task is safely preserved.");
      return;
    }

    if (
      daiPhaseRef.current === "WAITING_FOR_USER" &&
      /^(yes|yeah|yep|continue|go ahead|resume|sure|please continue)[.! ]*$/i.test(text)
    ) {
      resumePausedTask();
      return;
    }

    // Wake words & Direct Voice Commands
    if (/^(?:hey\s+)?(?:jarvis\s+)?(?:open\s+|launch\s+|show\s+)?(?:man\s*1|man\s*one|man-1|operations|operation|dashboard)[.!]?$/i.test(text)) {
      speakText("Opening MAN 1 Autonomous Control Center, Sir.", false);
      setLocation("/man1");
      return;
    }

    if (/^(?:hey\s+)?(?:jarvis\s+)?(?:open\s+|launch\s+|show\s+)?(?:trace|trace\s*gps|tracking|location)[.!]?$/i.test(text)) {
      speakText("Opening Trace GPS Telemetry Suite, Sir.", false);
      setLocation("/trace");
      return;
    }

    if (/^(?:hey\s+)?(?:jarvis\s+)?(?:show\s+sources?|sources?|open\s+sources?|show\s+me\s+the\s+sources?)[.!]?$/i.test(text)) {
      const lastAssistant = [...messagesRef.current].reverse().find((m) => m.role === "assistant");
      if (lastAssistant) {
        setSelectedResponse(lastAssistant);
        speakText("Displaying verified media and source citations for the latest analysis.", false);
      } else {
        speakText("No active source citations to display yet. Ask me a question first, Sir.", false);
      }
      return;
    }

    if (
      /^(?:what(?:'s|\s+is|\s+else\s+is)?\s+trending\s+with\s+(?:gpt\s+)?(?:6\s+)?astra|tell\s+me\s+about\s+astra|higgsfield)[.?! ]*$/i.test(text)
    ) {
      if (/what\s+else/i.test(text) || /higgsfield/i.test(text)) {
        triggerDaiDeck(PRESET_DAI_DECKS["higgsfield-showcase"]);
      } else {
        triggerDaiDeck(PRESET_DAI_DECKS["gpt6-astra"]);
      }
      return;
    }

    if (/^(?:hey\s+)?(?:jarvis\s+)?(?:show|open|trigger|run)?\s*(?:dai|daily\s+ai|briefing|attention\s+interface)[.!]?$/i.test(text)) {
      triggerDaiDeck(PRESET_DAI_DECKS["gpt6-astra"]);
      return;
    }

    if (/^(?:yes(?:\s+please)?|open\s+chatgpt|open\s+higgsfield|launch\s+higgsfield)[.!]?$/i.test(text)) {
      window.open("https://chatgpt.com", "_blank");
      speakText("Opening ChatGPT with the Higgsfield integration for you right now, sir.", false);
      return;
    }

    const showUserMsg = options.showUserMessage !== false;
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    finalTranscriptRef.current = "";
    transcriptBufferRef.current = "";
    setInterimText("");
    setErrorMessage("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setIsListening(false);

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      id: `user-${Date.now()}-${Math.random()}`,
    };

    const nextMessages = showUserMsg ? [...messagesRef.current, userMsg] : messagesRef.current;
    const historyForAi = showUserMsg ? nextMessages : [...nextMessages, userMsg];

    if (showUserMsg) {
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
    }

    try {
      const history = historyForAi.slice(-15).map((m) => ({ role: m.role, content: m.content }));
      const screenImage = captureScreenFrame();

      const response = await chatMutation.mutateAsync({
        messages: history,
        ...(screenImage ? { screenImage } : {}),
        ...(options.screenAutoAnalyze ? { screenAutoAnalyze: true } : {}),
      });

      if (response.newsArticles && response.newsArticles.length > 0) {
        setNewsArticles(response.newsArticles);
        setShowNewsBriefing(true);
      }
      if (response.sourceLinks && response.sourceLinks.length > 0) {
        setSourceLinks(response.sourceLinks);
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.reply,
        id: `assistant-${Date.now()}-${Math.random()}`,
        topicImages: response.topicImages,
        topicMedia: (response as any).topicMedia,
      };

      const finalMessages = [...messagesRef.current, assistantMsg];
      messagesRef.current = finalMessages;
      setMessages(finalMessages);
      if (DAI_ACTIVE_PHASES.includes(daiPhaseRef.current)) {
        daiDeferredReplyRef.current = response.reply;
        setDaiNotice("The previous task finished safely and is ready to resume.");
      } else {
        speakText(response.reply, true);
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "JARVIS could not connect.";
      setErrorMessage(msg);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      window.setTimeout(() => void startListening(), 600);
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    screenActiveRef.current = false;
    screenAutoAnalyzedRef.current = false;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setScreenActive(false);
    setScreenStatus("Screen access off");
  };

  const toggleScreenShare = async () => {
    if (screenActive) {
      stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenStatus("Screen sharing is not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      screenActiveRef.current = true;
      setScreenActive(true);
      setScreenStatus("Screen shared. Ask JARVIS what you are looking at.");
      stream.getVideoTracks()[0].addEventListener("ended", stopScreenShare);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        await screenVideoRef.current.play();
      }

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));

      if (screenStreamRef.current === stream && !screenAutoAnalyzedRef.current && !isPendingRef.current) {
        screenAutoAnalyzedRef.current = true;
        handleSendMessage("Inspect the shared screen and tell me what it contains.", {
          showUserMessage: false,
          screenAutoAnalyze: true,
        });
      }
    } catch {
      setScreenStatus("Screen access was cancelled");
    }
  };

  const stopCameraGestures = () => {
    if (cameraAnimRef.current) cancelAnimationFrame(cameraAnimRef.current);
    cameraAnimRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    prevFrameRef.current = null;
    setCameraActive(false);
    setCameraStatus("Camera gestures off");
  };

  const toggleCameraGestures = async () => {
    if (cameraActive) {
      stopCameraGestures();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("Camera is not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
      });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      setCameraStatus("Show a quick wave left or right");
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }

      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 48;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const processGesture = () => {
        const video = cameraVideoRef.current;
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          cameraAnimRef.current = requestAnimationFrame(processGesture);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const prev = prevFrameRef.current;
        if (prev) {
          let diffPixels = 0;
          let sumX = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            if (Math.abs(imgData[i] - prev[i]) > 35) {
              const pixelIdx = i / 4;
              diffPixels += 1;
              sumX += pixelIdx % canvas.width;
            }
          }
          const now = Date.now();
          if (diffPixels > 120 && now - lastGestureTimeRef.current > 2200) {
            const avgX = sumX / diffPixels;
            const command =
              avgX < canvas.width * 0.42
                ? "open calculator"
                : avgX > canvas.width * 0.58
                ? "open browser"
                : "what time is it";
            lastGestureTimeRef.current = now;
            setCameraStatus(`Gesture detected: ${command}`);
            handleSendMessage(command);
          }
        }
        prevFrameRef.current = new Uint8ClampedArray(imgData);
        cameraAnimRef.current = requestAnimationFrame(processGesture);
      };
      cameraAnimRef.current = requestAnimationFrame(processGesture);
    } catch {
      setCameraStatus("Camera permission was denied");
      stopCameraGestures();
    }
  };

  const startListening = async () => {
    if (isPendingRef.current || isSpeakingRef.current || isListeningRef.current) return;
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Speech input is not supported in this browser. You can type anytime.");
      return;
    }
    await startMicrophone();
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setErrorMessage("");
        finalTranscriptRef.current = "";
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i]?.[0];
          if (res) {
            if (event.results[i].isFinal) finalChunk += res.transcript + " ";
            else interim += res.transcript;
          }
        }

        const cleanFinal = finalChunk.trim().toLowerCase();

        // Direct Wake Words during speech
        if (cleanFinal.match(/^(?:hey\s+)?(?:jarvis\s+)?(?:man\s*1|man\s*one|man-1|open\s+man\s*1|open\s+man\s*one)$/i)) {
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
          speakText("Opening MAN 1 Autonomous Control Center, Sir.", false);
          setLocation("/man1");
          return;
        }

        if (cleanFinal.match(/^(?:hey\s+)?(?:jarvis\s+)?(?:show\s+sources?|sources?|open\s+sources?|show\s+me\s+the\s+sources?)$/i)) {
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
          const lastAssistant = [...messagesRef.current].reverse().find((m) => m.role === "assistant");
          if (lastAssistant) {
            setSelectedResponse(lastAssistant);
            speakText("Displaying verified media and source citations for the latest analysis.", false);
          } else {
            speakText("No active source citations to display yet. Ask me a question first, Sir.", false);
          }
          return;
        }

        if (cleanFinal.match(/^(?:hey\s+)?(?:jarvis\s+)?(?:trace|trace\s*gps|open\s+trace|tracking)$/i)) {
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
          speakText("Opening Trace GPS Telemetry Suite, Sir.", false);
          setLocation("/trace");
          return;
        }

        if (finalChunk) finalTranscriptRef.current += finalChunk;
        const currentText = (finalTranscriptRef.current + " " + interim).trim();
        if (currentText) {
          transcriptBufferRef.current = currentText;
          setInterimText(currentText);
        }

        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = setTimeout(() => {
          const queryToSend = transcriptBufferRef.current.trim();
          if (queryToSend.length > 0 && !isPendingRef.current) {
            handleSendMessage(queryToSend);
          }
        }, 1200);
      };

      recognition.onerror = (e: any) => {
        if (e.error === "not-allowed") {
          setErrorMessage("Microphone access was denied. Please allow microphone permissions or type directly.");
          isListeningRef.current = false;
          setIsListening(false);
          stopMicrophone();
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;

        if (transcriptBufferRef.current.trim().length > 0 && !isPendingRef.current) {
          const query = transcriptBufferRef.current.trim();
          handleSendMessage(query);
          return;
        }

        if (!isSpeakingRef.current && !isPendingRef.current && !isInputFocused) {
          window.setTimeout(() => {
            if (!isSpeakingRef.current && !isPendingRef.current && !isListeningRef.current) {
              startListening();
            }
          }, 350);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      isListeningRef.current = false;
      setIsListening(false);
      stopMicrophone();
    }
  };

  const handleAwaken = () => {
    setShowWakePrompt(false);
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Check if welcome message was already delivered in this session
    const hasWelcomed = sessionStorage.getItem("jarvis_welcomed");
    if (hasWelcomed) {
      const readyMsg: ChatMessage = {
        role: "assistant",
        content: "JARVIS online. How may I assist you, Sir?",
        id: `ready-${Date.now()}`,
      };
      messagesRef.current = [readyMsg];
      setMessages([readyMsg]);
      startListening();
      return;
    }

    sessionStorage.setItem("jarvis_welcomed", "true");
    const welcomeMsg: ChatMessage = {
      role: "assistant",
      content: WELCOME_SPEECH,
      id: `welcome-${Date.now()}`,
    };
    messagesRef.current = [welcomeMsg];
    setMessages([welcomeMsg]);
    speakText(WELCOME_SPEECH, true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) {
        if (e.key === "Escape") {
          setInputText("");
          inputRef.current?.blur();
          setIsInputFocused(false);
          if (!isSpeakingRef.current && !isPendingRef.current) {
            startListening();
          }
        }
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !(e.key.length > 1 && e.key !== "Backspace")) {
        inputRef.current?.focus();
        setIsInputFocused(true);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
          recognitionRef.current = null;
          isListeningRef.current = false;
          setIsListening(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    const timer = window.setTimeout(() => {
      try {
        handleAwaken();
      } catch {
        setShowWakePrompt(true);
      }
    }, 450);

    const onUserInteraction = () => {
      if (!hasInitializedRef.current) handleAwaken();
    };

    window.addEventListener("pointerdown", onUserInteraction, { once: true });
    window.addEventListener("keydown", onUserInteraction, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (daiCompletionTimerRef.current) window.clearTimeout(daiCompletionTimerRef.current);
      if (daiResumeTimerRef.current) window.clearTimeout(daiResumeTimerRef.current);
      recognitionRef.current?.abort();
      stopCameraGestures();
      stopMicrophone();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const triggerDaiCategoryEvent = (category: string) => {
    if (category === "Technology" || category === "Science") {
      triggerDaiDeck(PRESET_DAI_DECKS["gpt6-astra"]);
      return;
    }
    if (category === "Projects" || category === "Messages" || category === "Calls") {
      triggerDaiDeck(PRESET_DAI_DECKS["man1-executive"]);
      return;
    }

    const sample = SAMPLE_DAI_EVENTS[category] || SAMPLE_DAI_EVENTS["World"];
    const dynamicDeck: DaiDeckBriefing = {
      id: `deck-${category.toLowerCase()}-${Date.now()}`,
      topicTitle: `${category} Intelligence Briefing`,
      topicKicker: `${category.toUpperCase()} TELEMETRY · LIVE DISPATCH`,
      importance: (sample.importance as any) || "high",
      category,
      introSpeech: `Sir, important new updates have arrived in ${category}. Here is your priority breakdown:`,
      closingSpeech: `That concludes the ${category} briefing. Shall I continue with your previous task?`,
      actionPrompt: `Take action on ${category} dispatch?`,
      primaryActionLabel: sample.link ? "Open Dispatch Source" : "Review Details",
      primaryActionUrl: sample.link || undefined,
      secondaryActionLabel: "Resume Task",
      sections: [
        {
          id: `sec-${category}-1`,
          numberPrefix: "First",
          title: sample.title || `${category} Headline`,
          subtitle: `${sample.source || "JARVIS News"} · Priority Alert`,
          source: sample.source || "Global Telemetry",
          category,
          image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
          badge: "PRIORITY 1",
          metrics: [
            { label: "Category", value: category },
            { label: "Urgency", value: "High" },
            { label: "Relevance", value: "Verified" },
          ],
          summary: sample.summary || "Significant event registered in the peripheral attention monitoring queue.",
          whyItMatters: sample.whyItMatters || "Impacts overall timeline and strategic operational flow.",
          speechScript: `First: ${sample.title}. ${sample.summary}`,
          link: sample.link,
          actionText: "Open Full Report",
        },
        {
          id: `sec-${category}-2`,
          numberPrefix: "Second",
          title: "Market Impact & Strategic Telemetry",
          subtitle: `Automated predictive analysis for ${category}`,
          source: "JARVIS Neural Engine",
          category,
          image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
          badge: "ANALYSIS",
          metrics: [
            { label: "Risk Index", value: "Low (0.12)" },
            { label: "Confidence", value: "98.4%" },
            { label: "Impact", value: "Immediate" },
          ],
          summary: "Our neural monitoring network observed secondary ripple effects across related sectors and ongoing projects.",
          whyItMatters: sample.whyItMatters || "Ensures proactive response rather than reactive mitigation.",
          speechScript: `Second: ${sample.whyItMatters}`,
          actionText: "Inspect Predictive Telemetry",
        },
      ],
    };
    triggerDaiDeck(dynamicDeck);
  };

  const isDaiActive = daiPhase !== "JARVIS_IDLE";
  const isOrbActive = isListening || isPending || isSpeaking || isDaiActive;
  const isTyping = isInputFocused || inputText.length > 0;
  const statusLabel = isDaiActive
    ? `DAI ${daiPhase.replaceAll("_", " ")}`
    : isSpeaking
    ? "JARVIS Speaking"
    : isPending
    ? "JARVIS Thinking"
    : isTyping
    ? "Noticing Typing..."
    : isListening
    ? "JARVIS Listening"
    : "JARVIS Ready";

  const statusClass = isDaiActive
    ? "jarvis-status-badge--dai"
    : isSpeaking
    ? "jarvis-status-badge--speaking"
    : isPending
    ? "jarvis-status-badge--thinking"
    : isTyping || isListening
    ? "jarvis-status-badge--listening"
    : "";

  return (
    <main
      className="jarvis-screen"
      onClick={() => {
        if (!hasInitializedRef.current) handleAwaken();
      }}
    >
      <div className="jarvis-backdrop" />

      {/* Primary Top Holographic Navigation Bar */}
      <nav
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#090f1d]/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl px-3 py-1.5 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-xs font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
        >
          <Sparkles className="size-3.5" />
          <span>JARVIS Core</span>
        </button>

        <button
          onClick={() => setLocation("/ai-builder")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-all group"
        >
          <Brain className="size-3.5 text-cyan-400 group-hover:animate-pulse" />
          <span className="font-bold text-white group-hover:text-cyan-300">AI Builder</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            LLM
          </span>
        </button>

        <button
          onClick={() => setLocation("/man1")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all"
        >
          <Activity className="size-3.5 text-amber-400" />
          <span>MAN1 Operations</span>
        </button>

        <button
          onClick={() => setLocation("/trace")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-all"
        >
          <MapPin className="size-3.5 text-emerald-400" />
          <span>Trace</span>
        </button>
      </nav>

      {/* Real-Time Background MAN-1 Alert Notification */}
      {liveMan1Alert && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-[#141008]/95 px-5 py-3 shadow-[0_0_30px_rgba(255,180,50,0.35)] backdrop-blur-2xl animate-in fade-in slide-in-from-top duration-300 cursor-pointer max-w-md w-[92vw]"
          onClick={() => {
            setLocation("/man1");
            setLiveMan1Alert(null);
          }}
          role="alert"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
            {liveMan1Alert.type?.includes("EMAIL") ? <Mail className="size-4 animate-bounce" /> : <Bell className="size-4 animate-pulse" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-semibold">MAN-1 Live Alert</span>
              <span className="text-[10px] text-slate-400">• Just now</span>
            </div>
            <p className="text-xs font-semibold text-white truncate">{liveMan1Alert.title}</p>
            <p className="text-[11px] text-slate-300 truncate">From: {liveMan1Alert.sender}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLiveMan1Alert(null);
            }}
            className="text-slate-400 hover:text-white p-1 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {showWakePrompt && (
        <button
          className="wake-prompt"
          onClick={(e) => {
            e.stopPropagation();
            handleAwaken();
          }}
          aria-label="Wake JARVIS"
        >
          <span className="wake-dot" />
          <span>TAP TO AWAKEN JARVIS</span>
        </button>
      )}

      <section className="jarvis-stage" aria-label="JARVIS voice visualizer">
        <JarvisOrb
          active={isOrbActive}
          speaking={isSpeaking}
          level={level}
          bass={bass}
          treble={treble}
        />

        <div className={`jarvis-status-badge ${statusClass}`} aria-live="polite">
          <span className="jarvis-status-dot" />
          <span>{statusLabel}</span>
        </div>

        {!daiDeck && (daiPhase !== "JARVIS_IDLE" || daiQueue.length > 0 || daiNotice) && (
          <aside
            className={`dai-surface dai-surface--${daiPhase.toLowerCase()}`}
            aria-live="assertive"
            aria-label="Dynamic Attention Interface interruption"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dai-surface-curve" />
            <div className="dai-surface-orbit" />
            <div className="dai-surface-inner">
              <div className="dai-surface-header">
                <div className="dai-surface-kicker">
                  <span className="dai-live-dot" />
                  <span>DAI · {daiPhase.replaceAll("_", " ")}</span>
                </div>
                <span className="dai-priority-label">
                  {daiEvent ? `${daiEvent.importance.toUpperCase()} PRIORITY` : "ATTENTION LAYER"}
                </span>
              </div>

              {daiEvent ? (
                <div className="dai-briefing-content">
                  <div className="dai-briefing-meta">
                    <span>{daiEvent.category}</span>
                    <span>•</span>
                    <span>{daiEvent.source}</span>
                    <span>•</span>
                    <time dateTime={daiEvent.timestamp}>{new Date(daiEvent.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                  <h2>{daiEvent.title}</h2>
                  <p>{daiEvent.summary}</p>
                  <div className="dai-why-it-matters">
                    <span>WHY IT MATTERS</span>
                    <p>{daiEvent.whyItMatters}</p>
                  </div>
                  {daiEvent.link && (
                    <a href={daiEvent.link} target="_blank" rel="noopener noreferrer" className="dai-source-link">
                      Open source ↗
                    </a>
                  )}
                </div>
              ) : (
                <p className="dai-surface-notice">{daiNotice || "DAI is waiting for a safe handoff."}</p>
              )}

              <div className="dai-surface-footer">
                <span>
                  {daiQueue.length > 0
                    ? `${daiQueue.length} lower-priority update${daiQueue.length === 1 ? "" : "s"} queued`
                    : daiContext
                    ? "Previous task preserved in memory"
                    : "Peripheral awareness active"}
                </span>
                {daiPhase === "WAITING_FOR_USER" && (
                  <button type="button" className="dai-continue-button" onClick={resumePausedTask}>
                    Continue where I left off
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}

        <div
          className={`jarvis-camera-panel ${cameraActive ? "jarvis-camera-panel--active" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <video
            ref={cameraVideoRef}
            className="jarvis-camera-preview"
            muted
            playsInline
            aria-label="Camera gesture preview"
          />
          <div className="jarvis-camera-controls">
            <button
              type="button"
              className="jarvis-camera-toggle"
              onClick={() => void toggleCameraGestures()}
            >
              {cameraActive ? "Disable camera gestures" : "Enable camera gestures"}
            </button>
            <span>{cameraStatus}</span>
          </div>
        </div>

        <div
          className={`jarvis-screen-panel ${screenActive ? "jarvis-screen-panel--active" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <video
            ref={screenVideoRef}
            className="jarvis-screen-preview"
            muted
            playsInline
            aria-label="Shared screen preview"
          />
          <div className="jarvis-screen-controls">
            <button
              type="button"
              className="jarvis-screen-toggle"
              onClick={() => void toggleScreenShare()}
            >
              {screenActive ? "Stop screen access" : "Share screen with JARVIS"}
            </button>
            <span>{screenStatus}</span>
          </div>
        </div>

        <div className="caption-area" aria-live="polite">
          <div className="caption-scroll" ref={captionScrollRef}>
            {messages.slice(-6).map((msg, index) => {
              const isLatest = index === messages.slice(-6).length - 1 && !isPending && !interimText;
              return msg.role === "assistant" ? (
                <button
                  key={msg.id}
                  type="button"
                  className={`caption-turn caption-turn--clickable ${
                    isLatest ? "caption-turn--latest" : "caption-turn--past"
                  } caption--assistant`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedResponse(msg);
                  }}
                  aria-label="Open full JARVIS response"
                >
                  {msg.content}
                </button>
              ) : (
                <p
                  key={msg.id}
                  className={`caption-turn ${
                    isLatest ? "caption-turn--latest" : "caption-turn--past"
                  } caption--user`}
                >
                  {msg.content}
                </p>
              );
            })}

            {isPending && (
              <p className="caption-turn caption-turn--latest caption--thinking">
                <span>JARVIS is processing</span>
                <span className="caption-thinking-dots">
                  <span />
                  <span />
                  <span />
                </span>
              </p>
            )}

            {isListening && interimText && (
              <p className="caption-turn caption-turn--latest caption--listening">
                <span className="caption-streaming-word">{interimText}</span>
                <span className="caption-streaming-cursor" />
              </p>
            )}
            <div ref={captionEndRef} />
          </div>

          {errorMessage && <small className="caption-error">{errorMessage}</small>}
        </div>

        {showNewsBriefing && newsArticles && newsArticles.length > 0 && (
          <div className="jarvis-news-briefing-card" onClick={(e) => e.stopPropagation()}>
            <div className="news-briefing-header">
              <div className="news-briefing-title-group">
                <span className="news-pulse-dot" />
                <span className="news-briefing-tag">LIVE HOT TOPICS BRIEFING</span>
              </div>
              <button
                type="button"
                className="news-close-btn"
                onClick={() => setShowNewsBriefing(false)}
                aria-label="Dismiss news briefing"
              >
                ✕
              </button>
            </div>
            <div className="news-briefing-items">
              {newsArticles.slice(0, 5).map((article, idx) => (
                <a
                  key={idx}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-briefing-item"
                >
                  <div className="news-item-badge">
                    <span className="news-item-num">
                      {idx === 0 ? "🔥 TOP STORY" : `#${idx + 1}`}
                    </span>
                    <span className="news-item-source">{article.source}</span>
                  </div>
                  <p className="news-item-title">{article.title}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {sourceLinks.length > 0 && (
          <div className="jarvis-source-card" onClick={(e) => e.stopPropagation()}>
            <div className="news-briefing-header">
              <div className="news-briefing-title-group">
                <span className="news-pulse-dot" />
                <span className="news-briefing-tag">SOURCES FOR THIS ANSWER</span>
              </div>
              <button
                type="button"
                className="news-close-btn"
                onClick={() => setSourceLinks([])}
                aria-label="Dismiss sources"
              >
                ✕
              </button>
            </div>
            <div className="news-briefing-items">
              {sourceLinks.map((src) => (
                <a
                  key={src.url}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-briefing-item"
                >
                  <div className="news-item-badge">
                    <span className="news-item-source">{src.source}</span>
                  </div>
                  <p className="news-item-title">{src.title}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="jarvis-input-container" onClick={(e) => e.stopPropagation()}>
          <form
            className={`jarvis-input-bar ${isTyping ? "jarvis-input-bar--active" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              if (inputText.trim()) {
                handleSendMessage(inputText);
                setInputText("");
                inputRef.current?.blur();
                setIsInputFocused(false);
              }
            }}
          >
            <span className="jarvis-input-icon">⌨</span>
            <input
              ref={inputRef}
              type="text"
              className="jarvis-input-field"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="Speak naturally, or simply start typing anywhere..."
              aria-label="Ask JARVIS anything"
            />
            {inputText.trim().length > 0 && (
              <button type="submit" className="jarvis-send-btn" aria-label="Send message">
                ↵
              </button>
            )}
          </form>

          <div className={`jarvis-input-hint ${isTyping ? "jarvis-input-hint--visible" : ""}`}>
            <span>
              Press <kbd>Enter ↵</kbd> to send
            </span>
            <span>•</span>
            <span>
              <kbd>Esc</kbd> to return to voice
            </span>
          </div>

          <div className="jarvis-quick-prompts">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="jarvis-prompt-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendMessage(item.query);
                }}
                disabled={isPending || isSpeaking}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedResponse && (() => {
        const topicMedia = selectedResponse.topicMedia || {
          images: selectedResponse.topicImages || [],
          videos: [],
          socialMedia: [],
        };
        const rawImages = topicMedia.images && topicMedia.images.length > 0 ? topicMedia.images : (selectedResponse.topicImages || []);
        const images = rawImages.length > 0 ? rawImages : [
          {
            id: "fallback-1",
            title: `${selectedResponse.content.slice(0, 30)}... Reference Overview`,
            thumbnailUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
            url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
            source: "Unsplash Pro HD",
          },
          {
            id: "fallback-2",
            title: "Neural Computational Matrix & Architecture",
            thumbnailUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1000&q=80",
            url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1000&q=80",
            source: "AI Research Vision",
          },
          {
            id: "fallback-3",
            title: "High-Performance Autonomous Systems Grid",
            thumbnailUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80",
            url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80",
            source: "Cybernetics Lab",
          },
        ];

        const querySlice = selectedResponse.content.slice(0, 35).replace(/[^\w\s]/g, "") || "Technology";
        const videos = topicMedia.videos && topicMedia.videos.length > 0 ? topicMedia.videos : [
          {
            id: "vid-def-1",
            title: `${querySlice}: Complete Architectural Breakdown & Demonstration`,
            thumbnailUrl: images[0]?.thumbnailUrl || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(querySlice + " breakdown tutorial")}`,
            platform: "YouTube" as const,
            channel: "MIT OpenCourseWare",
            duration: "14:20",
            views: "420K views",
          },
          {
            id: "vid-def-2",
            title: `${querySlice} in 100 Seconds: Fast Overview & Mechanics`,
            thumbnailUrl: images[1]?.thumbnailUrl || "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80",
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(querySlice + " 100 seconds")}`,
            platform: "YouTube" as const,
            channel: "Fireship Tech",
            duration: "02:18",
            views: "1.2M views",
          },
          {
            id: "vid-def-3",
            title: `Deep Dive Lecture & Analysis: The Future of ${querySlice}`,
            thumbnailUrl: images[2]?.thumbnailUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(querySlice + " deep dive")}`,
            platform: "TED" as const,
            channel: "Two Minute Papers",
            duration: "28:45",
            views: "890K views",
          },
        ];

        const socialMedia = topicMedia.socialMedia && topicMedia.socialMedia.length > 0 ? topicMedia.socialMedia : [
          {
            id: "soc-def-1",
            title: `Hacker News: Technical Discussion on ${querySlice}`,
            url: `https://news.ycombinator.com`,
            platform: "Hacker News" as const,
            author: "tech_architect",
            snippet: "Active developer community discussion regarding real-world benchmarks, edge cases, and architectural best practices.",
            metrics: "▲ 342 points • 💬 98 comments",
          },
          {
            id: "soc-def-2",
            title: `r/technology: How does ${querySlice} compare in production?`,
            url: `https://www.reddit.com/r/technology/search/?q=${encodeURIComponent(querySlice)}`,
            platform: "Reddit" as const,
            author: "u/deep_engineer",
            snippet: "In-depth Reddit discussion analyzing production deployments and comparative trade-offs.",
            metrics: "▲ 1.4k upvotes • 💬 284 comments",
          },
          {
            id: "soc-def-3",
            title: `Live Developer Thread & Industry Insights: #${querySlice.replace(/\s+/g, "")}`,
            url: `https://x.com/search?q=${encodeURIComponent(querySlice)}`,
            platform: "X / Twitter" as const,
            author: "@ai_engineer",
            snippet: "Breaking insights, telemetry notes, and engineering highlights shared by industry researchers.",
            metrics: "🔁 520 reposts • ❤️ 2.9k likes",
          },
        ];

        return (
          <div
            className="jarvis-response-overlay"
            role="presentation"
            onClick={() => setSelectedResponse(null)}
          >
            <article
              className="jarvis-response-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Full JARVIS response and media context"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="jarvis-response-modal-header">
                <div className="flex items-center gap-2">
                  <span className="jarvis-response-modal-badge">JARVIS INTELLIGENCE BRIEFING</span>
                </div>
                <button
                  type="button"
                  className="news-close-btn"
                  onClick={() => setSelectedResponse(null)}
                  aria-label="Close full response"
                >
                  ✕
                </button>
              </div>

              <div className="jarvis-response-modal-body">
                {/* Full Matter / Text */}
                <div className="jarvis-response-text-card">
                  <p className="jarvis-response-full-text">{selectedResponse.content}</p>
                </div>

                {/* Media Categories Navigation Bar */}
                <div className="jarvis-media-nav">
                  <div className="jarvis-media-nav-title">
                    <Layers className="size-4 text-cyan-400" />
                    <span>EXPLORE TOPIC MEDIA & CONTEXT</span>
                  </div>
                  <div className="jarvis-media-tabs">
                    <button
                      type="button"
                      className={`jarvis-media-tab ${activeMediaTab === "all" ? "jarvis-media-tab--active" : ""}`}
                      onClick={() => setActiveMediaTab("all")}
                    >
                      <span>🌐 All Media</span>
                    </button>
                    <button
                      type="button"
                      className={`jarvis-media-tab ${activeMediaTab === "images" ? "jarvis-media-tab--active" : ""}`}
                      onClick={() => setActiveMediaTab("images")}
                    >
                      <ImageIcon className="size-3.5" />
                      <span>Images ({images.length})</span>
                    </button>
                    <button
                      type="button"
                      className={`jarvis-media-tab ${activeMediaTab === "videos" ? "jarvis-media-tab--active" : ""}`}
                      onClick={() => setActiveMediaTab("videos")}
                    >
                      <Video className="size-3.5" />
                      <span>Videos ({videos.length})</span>
                    </button>
                    <button
                      type="button"
                      className={`jarvis-media-tab ${activeMediaTab === "social" ? "jarvis-media-tab--active" : ""}`}
                      onClick={() => setActiveMediaTab("social")}
                    >
                      <MessageSquare className="size-3.5" />
                      <span>Social Media ({socialMedia.length})</span>
                    </button>
                  </div>
                </div>

                {/* Images Section */}
                {(activeMediaTab === "all" || activeMediaTab === "images") && (
                  <section className="jarvis-media-section">
                    <div className="jarvis-media-section-header">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="size-4 text-cyan-300" />
                        <h3>High-Resolution Imagery & Visual References</h3>
                      </div>
                      <span className="jarvis-media-section-source">High-Res Unsplash Pro & Wikipedia Archive</span>
                    </div>
                    <div className="jarvis-images-grid">
                      {images.map((img, idx) => (
                        <a
                          key={img.id || img.url || idx}
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="jarvis-image-card group"
                        >
                          <div className="jarvis-image-wrapper">
                            <img src={img.thumbnailUrl} alt={img.title} loading="lazy" />
                            <div className="jarvis-image-overlay">
                              <ExternalLink className="size-5 text-white drop-shadow-md" />
                            </div>
                            {img.source && (
                              <span className="jarvis-image-source-badge">{img.source}</span>
                            )}
                          </div>
                          <div className="jarvis-image-meta">
                            <p className="jarvis-image-title">{img.title}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                {/* Videos Section */}
                {(activeMediaTab === "all" || activeMediaTab === "videos") && (
                  <section className="jarvis-media-section">
                    <div className="jarvis-media-section-header">
                      <div className="flex items-center gap-2">
                        <Video className="size-4 text-rose-400" />
                        <h3>Video Explanations & Technical Breakdown</h3>
                      </div>
                      <span className="jarvis-media-section-source">YouTube & Tech Streams</span>
                    </div>
                    <div className="jarvis-videos-grid">
                      {videos.map((vid, idx) => (
                        <a
                          key={vid.id || idx}
                          href={vid.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="jarvis-video-card group"
                        >
                          <div className="jarvis-video-thumbnail-box">
                            <img src={vid.thumbnailUrl} alt={vid.title} loading="lazy" />
                            <div className="jarvis-video-play-btn">
                              <Play className="size-4 fill-white text-white ml-0.5" />
                            </div>
                            <span className="jarvis-video-duration">{vid.duration}</span>
                            <span className="jarvis-video-platform">{vid.platform}</span>
                          </div>
                          <div className="jarvis-video-details">
                            <h4 className="jarvis-video-title">{vid.title}</h4>
                            <div className="jarvis-video-channel-row">
                              <span className="jarvis-video-channel">{vid.channel}</span>
                              {vid.views && <span>• {vid.views}</span>}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                {/* Social Media & Community Section */}
                {(activeMediaTab === "all" || activeMediaTab === "social") && (
                  <section className="jarvis-media-section">
                    <div className="jarvis-media-section-header">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-emerald-400" />
                        <h3>Social Media, Community Threads & Live Discussions</h3>
                      </div>
                      <span className="jarvis-media-section-source">Hacker News, Reddit & X</span>
                    </div>
                    <div className="jarvis-social-grid">
                      {socialMedia.map((item, idx) => (
                        <a
                          key={item.id || idx}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="jarvis-social-card group"
                        >
                          <div className="jarvis-social-card-header">
                            <span className={`jarvis-social-platform jarvis-social-platform--${item.platform.toLowerCase().replace(/[^a-z]/g, "")}`}>
                              {item.platform}
                            </span>
                            <span className="jarvis-social-author">{item.author}</span>
                          </div>
                          <h4 className="jarvis-social-title">{item.title}</h4>
                          <p className="jarvis-social-snippet">{item.snippet}</p>
                          {item.metrics && (
                            <div className="jarvis-social-footer">
                              <span>{item.metrics}</span>
                              <span className="jarvis-social-link-label">View thread ↗</span>
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </article>
          </div>
        );
      })()}

      {/* Video-Matched DAI Interactive Presentation Deck */}
      {daiDeck && (
        <DaiDeck
          deck={daiDeck}
          onClose={handleCloseDaiDeck}
          onAction={handleDaiAction}
          speakFn={speakWithCallback}
          stopSpeechFn={stopSpeech}
          isSpeaking={isSpeaking}
          voiceLevel={level}
        />
      )}
    </main>
  );
}
