import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  ExternalLink,
  Layers,
  Box,
  MapPin,
  CheckCircle2,
  X,
  Radio,
  Zap,
} from "lucide-react";

export interface DaiSectionItem {
  id: string;
  numberPrefix?: string;
  title: string;
  subtitle: string;
  source: string;
  category: string;
  image: string;
  badge?: string;
  interactiveType?: "3d-model" | "map-viewer" | "satellite-plan" | "code-render" | "standard";
  interactiveData?: {
    modelName?: string;
    partsCount?: string;
    renderTime?: string;
    buildingsCount?: string;
    coordinates?: string;
    framework?: string;
    stats?: { label: string; value: string }[];
  };
  metrics?: { label: string; value: string }[];
  summary: string;
  whyItMatters?: string;
  speechScript: string;
  link?: string;
  actionText?: string;
  actionUrl?: string;
}

export interface DaiDeckBriefing {
  id: string;
  topicTitle: string;
  topicKicker: string;
  importance: "low" | "medium" | "high" | "critical";
  category: string;
  introSpeech: string;
  closingSpeech: string;
  actionPrompt?: string;
  primaryActionLabel?: string;
  primaryActionUrl?: string;
  secondaryActionLabel?: string;
  sections: DaiSectionItem[];
}

export const PRESET_DAI_DECKS: Record<string, DaiDeckBriefing> = {
  "gpt6-astra": {
    id: "deck-astra-trending",
    topicTitle: "GPT-6 Astra & Higgsfield Ecosystem",
    topicKicker: "AGI HAS ARRIVED · TRENDING SHOWCASE",
    importance: "critical",
    category: "Technology",
    introSpeech:
      "Boss, AGI has arrived. GPT-6 Astra just dropped and people are already building seriously cool things with it. Here's what's trending:",
    closingSpeech:
      "Should I open ChatGPT with the Higgsfield integration so you can start building?",
    actionPrompt: "Ready to launch Astra x Higgsfield environment?",
    primaryActionLabel: "Open ChatGPT + Higgsfield",
    primaryActionUrl: "https://chatgpt.com",
    secondaryActionLabel: "Continue Task",
    sections: [
      {
        id: "astra-sec-1",
        numberPrefix: "First",
        title: "Studylabs · 3D Human Atlas in Browser",
        subtitle: "Extracted the human body into 2,014 3D modeled pieces",
        source: "@studylabs · Astra Engine",
        category: "3D Biology",
        badge: "2,014 PIECES",
        image:
          "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=1200&q=80",
        interactiveType: "3d-model",
        interactiveData: {
          modelName: "Human Anatomical Atlas v4.2",
          partsCount: "2,014 Isolated Meshes",
          renderTime: "60 FPS WebGPU",
          framework: "Astra WebGL3",
          stats: [
            { label: "Bones & Cartilage", value: "206" },
            { label: "Muscular Layers", value: "640" },
            { label: "Vascular Paths", value: "1,168" },
          ],
        },
        metrics: [
          { label: "Total Meshes", value: "2,014" },
          { label: "Browser Engine", value: "WebGPU" },
          { label: "Latency", value: "0ms Local" },
        ],
        summary:
          "The entire human body pulled apart into 2,014 individual modeled pieces running interactively in a browser with real-time dissection and isolation.",
        whyItMatters:
          "He's calling it a Renaissance of learning for medical students and bio-engineering teams worldwide.",
        speechScript:
          "First: the entire human body pulled apart into 2014 odd pieces, in a browser. He's calling it a Renaissance of learning.",
        link: "https://openai.com",
        actionText: "Explore 3D Anatomical Atlas",
      },
      {
        id: "astra-sec-2",
        numberPrefix: "Second",
        title: "Skyvision · Seoul Rebuilt in 3D",
        subtitle: "25 districts, a quarter of a million buildings, 43 minutes",
        source: "@skyvision · Astra Photogrammetry",
        category: "Urban 3D",
        badge: "250K+ BUILDINGS",
        image:
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        interactiveType: "map-viewer",
        interactiveData: {
          modelName: "Seoul Metropolitan Digital Twin",
          buildingsCount: "254,800 Buildings",
          renderTime: "43m Total Gen",
          coordinates: "37.5665° N, 126.9780° E",
          stats: [
            { label: "Districts Rendered", value: "25 / 25" },
            { label: "Topography Res", value: "10cm/px" },
            { label: "Lidar Point Cloud", value: "4.8B Points" },
          ],
        },
        metrics: [
          { label: "Districts", value: "25 All" },
          { label: "Buildings", value: "250k+" },
          { label: "Gen Time", value: "43 Mins" },
        ],
        summary:
          "All of Seoul rebuilt in 3D geometry. Every district, over a quarter million buildings generated from start to finish in only 43 minutes.",
        whyItMatters:
          "Unlocks instant municipal simulation, smart city traffic telemetry, and instant photorealistic environment baking.",
        speechScript:
          "Second: all of Seoul rebuilt in 3D. Every district, a quarter of a million buildings, 43 minutes start to finish.",
        link: "https://openai.com",
        actionText: "Open 3D Seoul Map View",
      },
      {
        id: "astra-sec-3",
        numberPrefix: "And the third",
        title: "ArchVision · Satellite in, Renovation out",
        subtitle: "Land surveys & orbital photos in, construction-ready site plans out",
        source: "@archvision · Astra Spatial",
        category: "Architecture",
        badge: "INSTANT CAD",
        image:
          "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
        interactiveType: "satellite-plan",
        interactiveData: {
          modelName: "Automated Civil Permitting Blueprint",
          renderTime: "12 Seconds",
          stats: [
            { label: "Zoning Validation", value: "100% Compliant" },
            { label: "Elevation Delta", value: "0.2mm Precision" },
            { label: "Export Format", value: "Revit / DWG" },
          ],
        },
        metrics: [
          { label: "Input", value: "Satellite & Drone" },
          { label: "Output", value: "Site Blueprint" },
          { label: "Speedup", value: "100x Faster" },
        ],
        summary:
          "Land surveys and satellite imagery feed directly into the vision model, automatically outputting structural renovation plans and permit blueprints.",
        whyItMatters:
          "Shrinks weeks of architectural surveying and drafting work into real-time interactive generation.",
        speechScript:
          "And the third: land surveys and satellite photos in, renovation plans out.",
        link: "https://openai.com",
        actionText: "View Renovation Blueprints",
      },
    ],
  },
  "higgsfield-showcase": {
    id: "deck-higgsfield-showcase",
    topicTitle: "Higgsfield Plugin Trending Builds",
    topicKicker: "ASTRA X HIGGSFIELD PIPELINE",
    importance: "high",
    category: "Generative Media",
    introSpeech:
      "That's the Higgsfield plugin, boss. Running right inside Astra. Astra does the thinking, Higgsfield makes it real. Look at what people are shipping with it:",
    closingSpeech:
      "Should I open ChatGPT with the Higgsfield integration so you can start building?",
    actionPrompt: "Launch Higgsfield plugin workbench?",
    primaryActionLabel: "Open Higgsfield Workspace",
    primaryActionUrl: "https://chatgpt.com",
    secondaryActionLabel: "Resume Operations",
    sections: [
      {
        id: "hf-sec-1",
        numberPrefix: "First",
        title: "Playable 3D Racer from Single Prompt",
        subtitle: "Mechanics, physics, game loop, and 3D assets generated in seconds",
        source: "@higgsfield · Plugin Demo",
        category: "Game Dev",
        badge: "ZERO-CODE GAME",
        image:
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
        interactiveType: "code-render",
        metrics: [
          { label: "Input", value: "1 Text Prompt" },
          { label: "Physics", value: "3D Rapier" },
          { label: "Assets", value: "Procedural 3D" },
        ],
        summary:
          "A fully playable retro 3D racer compiled directly from a single natural language description, complete with driving mechanics and animated terrain.",
        whyItMatters:
          "Demonstrates end-to-end procedural game generation without manual asset authoring.",
        speechScript:
          "First: A fully playable racer from a single prompt. Mechanics, story, every asset, generated.",
      },
      {
        id: "hf-sec-2",
        numberPrefix: "Second",
        title: "The Oval Office · Vibe Coded in Blender",
        subtitle: "Astra wrote the scene, Higgsfield built and rendered in Blender",
        source: "@higgsfield_ai · Studio Render",
        category: "3D Scene",
        badge: "BLENDER PIPELINE",
        image:
          "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
        interactiveType: "3d-model",
        metrics: [
          { label: "Scene", value: "Oval Office" },
          { label: "Lighting", value: "Cycles Raytraced" },
          { label: "Authoring", value: "Vibe Coded" },
        ],
        summary:
          "Astra generated the detailed scene descriptors and layout constraints, while Higgsfield automatically constructed and rendered the entire 3D room in Blender.",
        whyItMatters:
          "Eliminates friction between LLM creative intent and professional 3D DCC software suites.",
        speechScript:
          "Second: The Oval Office, vibe coded. Astra wrote the scene, Higgsfield built it in Blender and rendered it.",
      },
      {
        id: "hf-sec-3",
        numberPrefix: "Third",
        title: "All of New York in 20 Minutes",
        subtitle: "High density procedural city generation at scale",
        source: "@higgsfield_ai · Worldgen",
        category: "World Gen",
        badge: "20 MINS",
        image:
          "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80",
        interactiveType: "map-viewer",
        metrics: [
          { label: "City", value: "New York City" },
          { label: "Time", value: "20 Minutes" },
          { label: "Geometry", value: "Full LODs" },
        ],
        summary:
          "Procedural reconstruction of Manhattan and outer boroughs featuring accurate skyscraper heights, road layouts, and ambient day/night lighting.",
        whyItMatters:
          "Brings massive open-world creation within reach of individual creators in minutes.",
        speechScript:
          "Third: All of New York, 20 minutes.",
      },
      {
        id: "hf-sec-4",
        numberPrefix: "And fourth",
        title: "Fable 5.1 Pirate Battle Simulation",
        subtitle: "Astra & Higgsfield on top, Fable 5.1 engine underneath",
        source: "@fablestudio · Battle Engine",
        category: "Simulation",
        badge: "PHYSICS SIM",
        image:
          "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
        interactiveType: "3d-model",
        metrics: [
          { label: "Cannon Sim", value: "Fluid & Particle" },
          { label: "Water", value: "Gerstner Waves" },
          { label: "Engine", value: "Fable 5.1" },
        ],
        summary:
          "A cinematic pirate naval battle simulation generated in real-time combining Astra reasoning with Higgsfield physics-accurate fluid and cannon particles.",
        whyItMatters:
          "Shows real-time generative cinematics rivaling high-budget studio production.",
        speechScript:
          "And a pirate battle: Astra and Higgsfield on top, Fable 5.1 underneath. Not really a contest.",
      },
    ],
  },
  "man1-executive": {
    id: "deck-man1-exec",
    topicTitle: "MAN1 Autonomous Operations Briefing",
    topicKicker: "EXECUTIVE TELEMETRY & APPROVALS",
    importance: "high",
    category: "Projects",
    introSpeech:
      "Sir, three critical operational milestones have reached your MAN1 queue. Here is your priority breakdown:",
    closingSpeech:
      "Would you like me to open the MAN1 Approvals Terminal to review these actions?",
    actionPrompt: "Open MAN1 Operations Dashboard?",
    primaryActionLabel: "Open MAN1 Dashboard",
    primaryActionUrl: "/man1",
    secondaryActionLabel: "Dismiss Briefing",
    sections: [
      {
        id: "m1-sec-1",
        numberPrefix: "First",
        title: "Elena Vance · Partnership Term Sheet Review",
        subtitle: "High-value brand collaboration agreement awaiting signature",
        source: "MAN1 Instagram Ingestion",
        category: "Approvals",
        badge: "HIGH PRIORITY",
        image:
          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
        metrics: [
          { label: "Audience", value: "850k Verified" },
          { label: "Deal Value", value: "$45,000" },
          { label: "Status", value: "Pending Approval" },
        ],
        summary:
          "Elena Vance submitted the revised multi-channel term sheet. Policy engine passed preliminary checks; human-in-the-loop signoff required.",
        whyItMatters:
          "Locking this agreement enables immediate Q3 campaign rollout.",
        speechScript:
          "First: Priority term sheet from Elena Vance for 45 thousand dollars is waiting for your approval in the queue.",
      },
      {
        id: "m1-sec-2",
        numberPrefix: "Second",
        title: "Project Alpha CI Pipeline · Container v2.4 Live",
        subtitle: "All 18 automated security tests passed & deployed to production",
        source: "GitHub Actions / DevAgent",
        category: "Deployment",
        badge: "PROD DEPLOYED",
        image:
          "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
        metrics: [
          { label: "Tests Passed", value: "18 / 18" },
          { label: "Build Time", value: "1m 42s" },
          { label: "Latency", value: "4.2ms P99" },
        ],
        summary:
          "Autonomous release pipeline completed container verification and switched traffic to version 2.4.0 zero downtime.",
        whyItMatters:
          "Prepares system stability for today's high-traffic keynote event.",
        speechScript:
          "Second: Production container version 2.4 is live. All 18 automated integration tests succeeded.",
      },
      {
        id: "m1-sec-3",
        numberPrefix: "And third",
        title: "Dr. Aris Thorne · Telemetry Protocol Call",
        subtitle: "Scheduled quantum cryptography synchronization session",
        source: "Secure Comms Agent",
        category: "Communications",
        badge: "CRITICAL CALL",
        image:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
        metrics: [
          { label: "Time", value: "14:00 UTC" },
          { label: "Channel", value: "Encrypted SIP" },
          { label: "Priority", value: "Critical" },
        ],
        summary:
          "Upcoming high-bandwidth synchronization with Dr. Thorne regarding quantum key distribution protocols.",
        whyItMatters:
          "Guarantees end-to-end verification of hardware encryption modules.",
        speechScript:
          "And third: High-priority telemetry call with Doctor Aris Thorne is confirmed on the encrypted channel.",
      },
    ],
  },
};

interface DaiDeckProps {
  deck: DaiDeckBriefing;
  onClose: () => void;
  onAction?: (actionLabel: string, url?: string) => void;
  speakFn: (text: string, onEnd?: () => void) => void;
  stopSpeechFn: () => void;
  isSpeaking: boolean;
  voiceLevel?: number;
}

export function DaiDeck({
  deck,
  onClose,
  onAction,
  speakFn,
  stopSpeechFn,
  isSpeaking,
  voiceLevel = 0,
}: DaiDeckProps) {
  // -1 = Intro overview state, 0..N-1 = Active section popup, N = Completed overview & call to action
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const stepTimerRef = useRef<number | null>(null);
  const hasStartedRef = useRef<boolean>(false);
  const isAutoPlayingRef = useRef<boolean>(isAutoPlaying);
  isAutoPlayingRef.current = isAutoPlaying;

  const currentSection =
    activeStep >= 0 && activeStep < deck.sections.length
      ? deck.sections[activeStep]
      : null;

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);
      stopSpeechFn();
    };
  }, [stopSpeechFn]);

  // Voice Narrate current step and handle transition
  const executeStep = (stepIndex: number) => {
    if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);
    setActiveStep(stepIndex);

    // If muted or not autoplaying speech
    if (isMuted) {
      if (stepIndex < deck.sections.length) {
        stepTimerRef.current = window.setTimeout(() => {
          if (isAutoPlayingRef.current) {
            executeStep(stepIndex + 1);
          }
        }, 5500);
      }
      return;
    }

    let speechText = "";
    if (stepIndex === -1) {
      speechText = deck.introSpeech;
    } else if (stepIndex >= 0 && stepIndex < deck.sections.length) {
      speechText = deck.sections[stepIndex].speechScript;
    } else {
      speechText = deck.closingSpeech;
    }

    // Safety duration estimate
    const approxDuration = Math.max(3800, speechText.split(" ").length * 360);

    let advanceScheduled = false;
    const handleSpeechFinished = () => {
      if (advanceScheduled) return;
      advanceScheduled = true;
      if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);

      // Brief pause between closing the card and opening next
      stepTimerRef.current = window.setTimeout(() => {
        if (isAutoPlayingRef.current) {
          if (stepIndex === -1) {
            // After intro, pop up section 0
            executeStep(0);
          } else if (stepIndex < deck.sections.length - 1) {
            // After section N, pop up section N+1
            executeStep(stepIndex + 1);
          } else if (stepIndex === deck.sections.length - 1) {
            // After all sections, show closing CTA
            executeStep(deck.sections.length);
          }
        }
      }, 700);
    };

    // Speak with callback
    speakFn(speechText, handleSpeechFinished);

    // Fallback timer
    stepTimerRef.current = window.setTimeout(() => {
      handleSpeechFinished();
    }, approxDuration + 1800);
  };

  // Start sequence on mount
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      const initTimer = window.setTimeout(() => {
        executeStep(-1);
      }, 400);
      return () => window.clearTimeout(initTimer);
    }
  }, []);

  // Manual Jump to specific section
  const jumpToSection = (index: number) => {
    if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);
    stopSpeechFn();
    executeStep(index);
  };

  const togglePlayPause = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);
      stopSpeechFn();
    } else {
      setIsAutoPlaying(true);
      isAutoPlayingRef.current = true;
      executeStep(activeStep === -1 ? 0 : activeStep);
    }
  };

  const replayCurrent = () => {
    if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);
    stopSpeechFn();
    executeStep(activeStep);
  };

  const stepNext = () => {
    if (activeStep < deck.sections.length) {
      jumpToSection(activeStep + 1);
    }
  };

  const stepPrev = () => {
    if (activeStep > 0) {
      jumpToSection(activeStep - 1);
    } else if (activeStep === 0) {
      jumpToSection(-1);
    }
  };

  return (
    <div
      className="dai-deck-overlay fixed inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-2xl select-none animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Background ambient lighting glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-cyan-500/15 via-amber-500/15 to-emerald-500/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-cyan-600/10 blur-[90px] rounded-full" />
      </div>

      {/* Top HUD Control Strip */}
      <header
        className="relative z-20 w-full max-w-6xl mb-4 flex items-center justify-between px-4 py-3 rounded-2xl border border-white/10 bg-[#070e17]/90 backdrop-blur-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Topic Badge */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-400/40 text-amber-300">
            <Sparkles className="size-4 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-cyan-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-widest font-mono font-bold uppercase text-amber-400">
                {deck.topicKicker}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                {deck.category}
              </span>
            </div>
            <h1 className="text-sm md:text-base font-bold text-slate-100 tracking-tight">
              {deck.topicTitle}
            </h1>
          </div>
        </div>

        {/* Center Section Step Indicators */}
        <nav aria-label="Section navigation" className="hidden sm:flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => jumpToSection(-1)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
              activeStep === -1
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Overview
          </button>
          {deck.sections.map((sec, idx) => {
            const isActive = activeStep === idx;
            const isCompleted = activeStep > idx;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => jumpToSection(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? "bg-cyan-500 text-black font-semibold shadow-lg shadow-cyan-500/30 scale-105"
                    : isCompleted
                    ? "bg-cyan-950/60 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="size-3 text-cyan-400" />
                ) : (
                  <span className="font-mono text-[10px]">{idx + 1}</span>
                )}
                <span>{sec.numberPrefix || `Part ${idx + 1}`}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => jumpToSection(deck.sections.length)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
              activeStep >= deck.sections.length
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Action
          </button>
        </nav>

        {/* Right Playback Controls & Close */}
        <div className="flex items-center gap-2">
          {/* Audio Speaking Wave Indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-cyan-950/80 border border-cyan-400/30 text-cyan-300 text-xs font-mono">
              <Radio className="size-3 text-cyan-400 animate-pulse mr-1" />
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0ms] h-2" />
                <span className="w-0.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:150ms] h-3" />
                <span className="w-0.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms] h-1.5" />
                <span className="w-0.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:200ms] h-2.5" />
              </div>
              <span className="ml-1 text-[10px]">JARVIS</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title={isMuted ? "Unmute Voice" : "Mute Voice"}
          >
            {isMuted ? <VolumeX className="size-4 text-rose-400" /> : <Volume2 className="size-4 text-cyan-300" />}
          </button>

          <button
            type="button"
            onClick={togglePlayPause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 text-xs font-medium transition shadow-sm"
          >
            {isAutoPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 fill-cyan-300 text-cyan-300" />}
            <span className="hidden md:inline">{isAutoPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            type="button"
            onClick={replayCurrent}
            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Replay Current Section"
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition"
            title="Close Briefing"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main
        className="relative z-10 w-full max-w-6xl flex-1 flex flex-col items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* State 1: Intro Overview Hook */}
        {activeStep === -1 && (
          <div className="w-full max-w-3xl flex flex-col items-center text-center p-8 rounded-3xl border border-amber-400/30 bg-gradient-to-b from-[#131109]/95 via-[#0b0f14]/95 to-[#070b10]/95 backdrop-blur-2xl shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="relative mb-6">
              <div className="size-20 rounded-2xl bg-gradient-to-br from-amber-400 to-cyan-500 p-[1px] shadow-xl shadow-amber-500/20">
                <div className="size-full rounded-2xl bg-[#080d14] flex items-center justify-center text-amber-300">
                  <Zap className="size-10 animate-pulse text-amber-400" />
                </div>
              </div>
              <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500 text-black font-mono font-black text-[10px]">
                LIVE INTEL
              </span>
            </div>

            <span className="font-mono text-xs font-bold tracking-widest text-amber-400 uppercase mb-2">
              DYNAMIC ATTENTION INTERFACE · ACTIVE
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">
              "{deck.introSpeech}"
            </h2>
            <p className="text-slate-300 text-sm max-w-xl mb-6">
              JARVIS is presenting <strong className="text-cyan-300">{deck.sections.length} core highlights</strong> sequentially.
              Watch the dynamic focus view or click any card to inspect immediately.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => jumpToSection(0)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/30 hover:scale-105 transition-all"
              >
                <span>Begin Presentation</span>
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* State 2: Active Focused Card Pop Up + Background Deck Row */}
        {currentSection && (
          <div className="w-full flex flex-col items-center justify-center animate-in fade-in duration-300">
            {/* The Large Popped-Up Modal Card */}
            <article className="relative w-full max-w-4xl rounded-3xl border-2 border-cyan-400/60 bg-gradient-to-b from-[#0b1723]/95 via-[#07111b]/95 to-[#04080e]/98 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_0_80px_rgba(6,182,212,0.25)] transition-all duration-500 scale-100">
              {/* Active scanning glowing laser line */}
              <div className="absolute -top-[2px] left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg bg-cyan-500 text-black font-black text-xs tracking-wider uppercase shadow-md shadow-cyan-500/20">
                    {currentSection.numberPrefix || `Section ${activeStep + 1}`}
                  </span>
                  <div>
                    <span className="text-xs font-mono text-cyan-300 font-medium">
                      {currentSection.source}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {currentSection.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentSection.badge && (
                    <span className="px-2.5 py-1 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold">
                      {currentSection.badge}
                    </span>
                  )}
                  <span className="text-xs font-mono text-slate-400">
                    {activeStep + 1} of {deck.sections.length}
                  </span>
                </div>
              </div>

              {/* Card Body: Interactive Media View & Detailed Insights */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Visual / Simulation Preview Canvas */}
                <div className="md:col-span-6 relative rounded-2xl overflow-hidden border border-cyan-400/30 bg-black/60 aspect-[16/10] group">
                  <img
                    src={currentSection.image}
                    alt={currentSection.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* Holographic grid overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

                  {/* HUD Overlay Data */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 border border-cyan-400/40 backdrop-blur-md">
                      {currentSection.interactiveType === "3d-model" ? (
                        <Box className="size-3.5 text-cyan-400" />
                      ) : currentSection.interactiveType === "map-viewer" ? (
                        <MapPin className="size-3.5 text-emerald-400" />
                      ) : (
                        <Layers className="size-3.5 text-amber-400" />
                      )}
                      <span className="text-[11px] font-mono text-white font-semibold">
                        {currentSection.category}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/30">
                      LIVE SIMULATION
                    </span>
                  </div>
                </div>

                {/* Content & Metrics */}
                <div className="md:col-span-6 flex flex-col justify-center space-y-4">
                  {/* Spoken highlight / speech transcript */}
                  <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/30">
                    <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono font-semibold mb-1">
                      <Volume2 className="size-3.5" />
                      <span>JARVIS NARRATION</span>
                    </div>
                    <p className="text-sm font-medium text-cyan-100 italic leading-snug">
                      "{currentSection.speechScript}"
                    </p>
                  </div>

                  {/* Summary & Why it matters */}
                  <div>
                    <h4 className="text-xs font-mono tracking-widest text-slate-400 uppercase mb-1">
                      BRIEFING SUMMARY
                    </h4>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {currentSection.summary}
                    </p>
                  </div>

                  {currentSection.whyItMatters && (
                    <div className="border-l-2 border-amber-400 pl-3 py-0.5">
                      <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider uppercase block">
                        WHY IT MATTERS
                      </span>
                      <p className="text-xs text-amber-100 font-medium leading-normal">
                        {currentSection.whyItMatters}
                      </p>
                    </div>
                  )}

                  {/* Metrics Row */}
                  {currentSection.metrics && currentSection.metrics.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {currentSection.metrics.map((met, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center text-center"
                        >
                          <span className="text-[10px] text-slate-400 font-mono">
                            {met.label}
                          </span>
                          <span className="text-xs font-bold text-cyan-300 font-mono">
                            {met.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center gap-3 pt-2">
                    {currentSection.actionText && (
                      <a
                        href={currentSection.link || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-semibold transition"
                      >
                        <span>{currentSection.actionText}</span>
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => stepNext()}
                      className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                    >
                      <span>Next</span>
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {/* Horizontal Deck Row (Thumbnail Strip at the bottom showing other cards) */}
            <div className="w-full max-w-4xl mt-6">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2 px-1">
                <span>CARD DECK PROGRESS</span>
                <span>
                  {activeStep + 1} / {deck.sections.length}
                </span>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {deck.sections.map((sec, idx) => {
                  const isCurrent = activeStep === idx;
                  const isPast = activeStep > idx;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => jumpToSection(idx)}
                      className={`relative text-left p-2.5 rounded-2xl border transition-all duration-300 ${
                        isCurrent
                          ? "border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/30 scale-105 ring-2 ring-cyan-400/50"
                          : isPast
                          ? "border-cyan-500/30 bg-[#061019]/60 opacity-60 hover:opacity-100"
                          : "border-white/10 bg-[#050b12]/60 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isCurrent
                              ? "bg-cyan-400 text-black"
                              : "bg-white/10 text-slate-300"
                          }`}
                        >
                          {sec.numberPrefix || `#${idx + 1}`}
                        </span>
                        {isPast && <CheckCircle2 className="size-3 text-cyan-400" />}
                      </div>
                      <p className="text-xs font-bold text-white line-clamp-1">
                        {sec.title}
                      </p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {sec.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* State 3: Completed Briefing & Call-to-Action */}
        {activeStep >= deck.sections.length && (
          <div className="w-full max-w-3xl flex flex-col items-center text-center p-8 rounded-3xl border border-emerald-400/40 bg-gradient-to-b from-[#091512]/95 via-[#060e15]/95 to-[#04080e]/98 backdrop-blur-2xl shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="size-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="size-8 text-emerald-400 animate-pulse" />
            </div>

            <span className="font-mono text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2">
              BRIEFING PRESENTATION COMPLETE
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3">
              "{deck.closingSpeech}"
            </h2>
            <p className="text-slate-300 text-sm max-w-lg mb-6">
              All {deck.sections.length} topical sections were reviewed. Select an action below or return to your previous workflow.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {deck.primaryActionLabel && (
                <a
                  href={deck.primaryActionUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (onAction) onAction(deck.primaryActionLabel!, deck.primaryActionUrl);
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-extrabold text-sm shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all"
                >
                  <Sparkles className="size-4" />
                  <span>{deck.primaryActionLabel}</span>
                  <ExternalLink className="size-3.5" />
                </a>
              )}

              <button
                type="button"
                onClick={() => jumpToSection(0)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition"
              >
                <RotateCcw className="size-4" />
                <span>Replay All</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 font-semibold text-sm transition"
              >
                {deck.secondaryActionLabel || "Resume Previous Task"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Footer Navigation Bar */}
      <footer
        className="relative z-20 w-full max-w-6xl mt-4 flex items-center justify-between px-4 py-2.5 rounded-2xl border border-white/10 bg-[#070e17]/80 backdrop-blur-xl text-xs text-slate-400 font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-2 rounded-full bg-cyan-400 animate-ping" />
          <span>DAI ADAPTIVE TELEMETRY V2.5</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={stepPrev}
            disabled={activeStep <= -1}
            className="flex items-center gap-1 px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <ChevronLeft className="size-3.5" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={stepNext}
            disabled={activeStep >= deck.sections.length}
            className="flex items-center gap-1 px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <span>Next</span>
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
