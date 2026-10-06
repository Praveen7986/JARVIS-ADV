import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  Mail,
  Instagram,
  GitCommit,
  Users,
  Moon,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  X,
  Play,
  RotateCcw,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BriefingReport, Man1AgentStats } from "../../../server/man1/types";

interface MorningCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  briefing?: BriefingReport | null;
  agentStats?: Man1AgentStats | null;
}

type CallStage =
  | "RINGING"
  | "GREETING"
  | "REPORT_EMAIL"
  | "REPORT_SENTIMENT"
  | "REPORT_DMS"
  | "REPORT_DEV"
  | "REPORT_COMMUNITY"
  | "REPORT_CONCLUSION"
  | "CALL_ENDED";

export function MorningCallModal({
  isOpen,
  onClose,
  briefing,
  agentStats,
}: MorningCallModalProps) {
  const [callStage, setCallStage] = useState<CallStage>("RINGING");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isJarvisSpeaking, setIsJarvisSpeaking] = useState(false);
  const [activeSpeechText, setActiveSpeechText] = useState("");

  const durationTimerRef = useRef<number | null>(null);
  const ringtoneOscillatorRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isAutoAdvancingRef = useRef(true);

  // Email, DM, Dev, Community counts
  const emailCount = agentStats?.email.received || 38;
  const draftsCount = agentStats?.email.requiresApproval || 11;
  const dmCount = agentStats?.instagram.dmsReceived || 322;
  const signupsCount = agentStats?.instagram.leadsIdentified || 98;
  const conversionRate = agentStats?.instagram.conversionRatePercent || 30.4;
  const fixTime = agentStats?.dev.lastFix?.pushedTime || "02:14 AM";
  const fixTests = agentStats?.dev.lastFix?.testedCount || 4;
  const communityCount = agentStats?.community.questionsReceived || 3;
  const bedtime = agentStats?.tasks.sleepSchedule.bedtime || "10:40 PM";

  // Play realistic phone ringtone using Web Audio API
  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playChime = () => {
        if (!audioContextRef.current || callStage !== "RINGING") return;
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.setValueAtTime(480, now + 0.1);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, now);
        osc2.frequency.setValueAtTime(520, now + 0.1);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.6);
        osc2.stop(now + 1.6);
      };

      playChime();
      const ringInterval = window.setInterval(() => {
        if (callStage === "RINGING") {
          playChime();
        } else {
          clearInterval(ringInterval);
        }
      }, 3000);
      ringtoneOscillatorRef.current = ringInterval;
    } catch {}
  };

  const stopRingtone = () => {
    if (ringtoneOscillatorRef.current) {
      clearInterval(ringtoneOscillatorRef.current);
      ringtoneOscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCallStage("RINGING");
      setCallDuration(0);
      startRingtone();
    } else {
      stopRingtone();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      stopRingtone();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isOpen]);

  // Handle Call Timer once answered
  useEffect(() => {
    if (callStage !== "RINGING" && callStage !== "CALL_ENDED") {
      durationTimerRef.current = window.setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callStage]);

  // Voice Narrator helper
  const speakJarvis = (text: string, onEnd?: () => void) => {
    setActiveSpeechText(text);
    if (!("speechSynthesis" in window) || isMuted) {
      const timer = window.setTimeout(() => {
        if (onEnd) onEnd();
      }, 4500);
      return () => window.clearTimeout(timer);
    }

    try {
      window.speechSynthesis.cancel();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice =
      voices.find((v) => /Google UK English Male|Microsoft George|Daniel|Oliver/i.test(v.name)) ||
      voices.find((v) => /en-GB/i.test(v.lang) && /male/i.test(v.name)) ||
      voices.find((v) => /en-GB/i.test(v.lang)) ||
      voices.find((v) => /en-US/i.test(v.lang)) ||
      voices[0];

    if (jarvisVoice) utterance.voice = jarvisVoice;
    utterance.rate = 1.02;
    utterance.pitch = 0.92;

    utterance.onstart = () => setIsJarvisSpeaking(true);
    utterance.onend = () => {
      setIsJarvisSpeaking(false);
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      setIsJarvisSpeaking(false);
      if (onEnd) onEnd();
    };

    window.setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsJarvisSpeaking(false);
      }
    }, 40);
  };

  // Stage Transitions & Voice Scripts
  const answerCall = () => {
    stopRingtone();
    setCallStage("GREETING");
    speakJarvis(
      "I know, sir. You told me to call you at six with the overnight report. Now, or in 5 minutes?",
      () => {
        // Wait for user prompt or auto advance
      }
    );
  };

  const deliverFastReport = () => {
    setCallStage("REPORT_EMAIL");
    speakJarvis(
      `${emailCount} emails came in while you slept. All labeled. The ${draftsCount} that need a reply are drafted and waiting for your approval.`,
      () => {
        setCallStage("REPORT_SENTIMENT");
        speakJarvis("No, sir. Nobody is mad at you.", () => {
          setCallStage("REPORT_DMS");
          speakJarvis(
            `${dmCount} people asked how to build their own agent. I answered everyone and sent them the Azaris link. ${signupsCount} signed up.`,
            () => {
              setCallStage("REPORT_DEV");
              speakJarvis(
                `TC pushed a fix at 2:14. I tested it ${fixTests} times. It works.`,
                () => {
                  setCallStage("REPORT_COMMUNITY");
                  speakJarvis(
                    `Three questions. I answered two. One is about billing, so I left it for you.`,
                    () => {
                      setCallStage("REPORT_CONCLUSION");
                      speakJarvis(
                        `That's everything since you went to bed at 10:40. Nothing needed you. Go back to sleep, sir. I'll call you at eight.`,
                        () => {}
                      );
                    }
                  );
                }
              );
            }
          );
        });
      }
    );
  };

  const jumpToStage = (stage: CallStage) => {
    setCallStage(stage);
    if (stage === "REPORT_EMAIL") {
      speakJarvis(
        `${emailCount} emails came in while you slept. All labeled. The ${draftsCount} that need a reply are drafted and waiting for your approval.`
      );
    } else if (stage === "REPORT_SENTIMENT") {
      speakJarvis("No, sir. Nobody is mad at you.");
    } else if (stage === "REPORT_DMS") {
      speakJarvis(
        `${dmCount} people asked how to build their own agent. I answered everyone and sent them the link. ${signupsCount} signed up.`
      );
    } else if (stage === "REPORT_DEV") {
      speakJarvis(`TC pushed a fix at 2:14. I tested it ${fixTests} times. It works.`);
    } else if (stage === "REPORT_COMMUNITY") {
      speakJarvis(`Three questions. I answered two. One is about billing, so I left it for you.`);
    } else if (stage === "REPORT_CONCLUSION") {
      speakJarvis(
        `That's everything since you went to bed at 10:40. Nothing needed you. Go back to sleep, sir. I'll call you at eight.`
      );
    }
  };

  const endCall = () => {
    stopRingtone();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setCallStage("CALL_ENDED");
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-500/15 via-blue-600/10 to-amber-500/10 blur-[140px] rounded-full" />
      </div>

      {/* Main Call Interface Container */}
      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-white/10 bg-[#07111b]/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden">
        {/* Top Header & Close */}
        <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-6">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-300 font-bold tracking-wider uppercase">
              JARVIS TELEMETRY LINE · 6:00 AM
            </span>
          </div>

          <button
            type="button"
            onClick={endCall}
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Call State 1: Ringing */}
        {callStage === "RINGING" && (
          <div className="w-full flex flex-col items-center py-6 animate-in zoom-in-95 duration-300">
            {/* Pulsing Avatar */}
            <div className="relative mb-6">
              <div className="size-28 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-[2px] animate-pulse shadow-2xl shadow-cyan-500/30">
                <div className="size-full rounded-full bg-[#061019] flex items-center justify-center text-cyan-300">
                  <PhoneCall className="size-12 animate-bounce" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-emerald-400 border-2 border-[#061019] flex items-center justify-center">
                <span className="size-2 rounded-full bg-white" />
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1">
              JARVIS
            </h2>
            <p className="text-xs font-mono text-cyan-300 uppercase tracking-widest mb-2">
              Scheduled 6:00 AM Overnight Briefing Call
            </p>
            <p className="text-slate-400 text-sm max-w-sm mb-8">
              "POV: Jarvis calls you at 6:00 am with the autonomous overnight report."
            </p>

            {/* Answer & Dismiss Buttons */}
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={endCall}
                className="flex flex-col items-center gap-2 text-xs font-medium text-rose-300 group"
              >
                <div className="size-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition shadow-lg">
                  <PhoneOff className="size-6" />
                </div>
                <span>Decline</span>
              </button>

              <button
                type="button"
                onClick={answerCall}
                className="flex flex-col items-center gap-2 text-xs font-medium text-emerald-300 group scale-110"
              >
                <div className="size-16 rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center text-black font-bold group-hover:bg-emerald-400 transition shadow-xl shadow-emerald-500/40 animate-pulse">
                  <Phone className="size-7" />
                </div>
                <span className="font-bold">Answer Call</span>
              </button>
            </div>
          </div>
        )}

        {/* Call State 2: Active Call & Report Stages */}
        {callStage !== "RINGING" && callStage !== "CALL_ENDED" && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            {/* Small Active Call Avatar & Timer */}
            <div className="flex items-center gap-3 mb-4 p-2 px-4 rounded-2xl bg-black/40 border border-white/10">
              <div className="size-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                <Sparkles className="size-4 animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-white leading-none">
                  JARVIS Voice Call Active
                </h3>
                <span className="text-[10px] font-mono text-emerald-400">
                  {formatDuration(callDuration)}
                </span>
              </div>

              {isJarvisSpeaking && (
                <div className="flex items-center gap-0.5 ml-2 h-3">
                  <span className="w-0.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0ms] h-2" />
                  <span className="w-0.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:150ms] h-3" />
                  <span className="w-0.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms] h-1.5" />
                </div>
              )}
            </div>

            {/* Spoken Text Transcript Bubble */}
            <div className="w-full p-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/30 text-left mb-5">
              <div className="flex items-center justify-between text-xs font-mono text-cyan-300 font-semibold mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="size-3.5" />
                  <span>JARVIS NARRATION</span>
                </div>
                <span className="text-[10px] text-slate-400">STAGE: {callStage}</span>
              </div>
              <p className="text-base text-slate-100 font-medium leading-relaxed italic">
                "{activeSpeechText || briefing?.fastMorningScript}"
              </p>
            </div>

            {/* High-Resolution Live Statistics Cards matching the Video */}
            <div className="w-full grid grid-cols-2 gap-3 mb-6">
              {/* Card 1: Email & Sentiment */}
              <div
                onClick={() => jumpToStage("REPORT_EMAIL")}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  callStage === "REPORT_EMAIL" || callStage === "REPORT_SENTIMENT"
                    ? "border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/20 scale-102 ring-1 ring-cyan-400"
                    : "border-white/10 bg-black/30 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1 text-slate-400 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-cyan-400" />
                    <span>EMAILS</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                    {emailCount} RECV
                  </span>
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {draftsCount} Drafted
                </div>
                <p className="text-[11px] text-emerald-300 font-medium">
                  ✓ Nobody is mad at you
                </p>
              </div>

              {/* Card 2: Instagram DMs & Conversion Funnel */}
              <div
                onClick={() => jumpToStage("REPORT_DMS")}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  callStage === "REPORT_DMS"
                    ? "border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/20 scale-102 ring-1 ring-cyan-400"
                    : "border-white/10 bg-black/30 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1 text-slate-400 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <Instagram className="size-3.5 text-pink-400" />
                    <span>DMS / LEADS</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 text-[10px] font-bold">
                    {dmCount} DMS
                  </span>
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {signupsCount} Signups
                </div>
                <p className="text-[11px] text-cyan-300 font-medium">
                  {conversionRate}% Conversion Rate
                </p>
              </div>

              {/* Card 3: Dev & Fix Deployment */}
              <div
                onClick={() => jumpToStage("REPORT_DEV")}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  callStage === "REPORT_DEV"
                    ? "border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/20 scale-102 ring-1 ring-cyan-400"
                    : "border-white/10 bg-black/30 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1 text-slate-400 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <GitCommit className="size-3.5 text-amber-400" />
                    <span>DEV FIX</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {fixTime}
                  </span>
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  Tested {fixTests}x
                </div>
                <p className="text-[11px] text-emerald-300 font-medium">
                  ✓ It works (CI Passed)
                </p>
              </div>

              {/* Card 4: Community & Sleep Schedule */}
              <div
                onClick={() => jumpToStage("REPORT_COMMUNITY")}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  callStage === "REPORT_COMMUNITY" || callStage === "REPORT_CONCLUSION"
                    ? "border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/20 scale-102 ring-1 ring-cyan-400"
                    : "border-white/10 bg-black/30 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1 text-slate-400 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-purple-400" />
                    <span>COMMUNITY</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                    {communityCount} Qs
                  </span>
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  2 Answered
                </div>
                <p className="text-[11px] text-amber-300 font-medium">
                  1 Billing for You
                </p>
              </div>
            </div>

            {/* Interactive User Voice / Dialogue Prompts */}
            <div className="w-full mb-6">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-2">
                TALK WITH JARVIS (POV DIALOGUE PROMPTS)
              </span>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {callStage === "GREETING" && (
                  <Button
                    type="button"
                    onClick={deliverFastReport}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs"
                  >
                    "Now, fast."
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => jumpToStage("REPORT_SENTIMENT")}
                  className="border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                >
                  "Is anyone mad?"
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => jumpToStage("REPORT_DMS")}
                  className="border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                >
                  "DMs?"
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => jumpToStage("REPORT_DEV")}
                  className="border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                >
                  "Updates on Azaris?"
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => jumpToStage("REPORT_COMMUNITY")}
                  className="border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                >
                  "And the community?"
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => jumpToStage("REPORT_CONCLUSION")}
                  className="border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                >
                  "Thank you."
                </Button>
              </div>
            </div>

            {/* End Call Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={endCall}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/30 transition"
              >
                <PhoneOff className="size-4" />
                <span>End Call & Go Back to Sleep</span>
              </button>
            </div>
          </div>
        )}

        {/* Call Ended */}
        {callStage === "CALL_ENDED" && (
          <div className="py-8 flex flex-col items-center animate-in fade-in duration-300">
            <div className="size-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <PhoneOff className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Call Ended</h3>
            <p className="text-xs text-slate-400">
              JARVIS will wake you at 8:00 AM with the day's schedule.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
