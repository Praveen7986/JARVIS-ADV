import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  ExternalLink,
  Flame,
  GitCommit,
  GitPullRequest,
  HelpCircle,
  Inbox,
  Instagram,
  Key,
  Layers,
  ListTodo,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  Pause,
  Phone,
  PhoneCall,
  Play,
  PlayCircle,
  Radio,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smile,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MorningCallModal } from "@/components/MorningCallModal";

type ActiveTab =
  | "briefing"
  | "approvals"
  | "email"
  | "instagram"
  | "community"
  | "dev"
  | "tasks"
  | "policies"
  | "audit"
  | "credentials";

export default function Man1Dashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("briefing");
  const [speaking, setSpeaking] = useState(false);
  const [explainingItem, setExplainingItem] = useState<{ title: string; text: string } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationToast, setSimulationToast] = useState("");

  const [isMorningCallOpen, setIsMorningCallOpen] = useState(false);
  const [integrationToast, setIntegrationToast] = useState<{ service: string; message: string; success: boolean } | null>(null);

  const utils = trpc.useUtils();
  const statusQuery = trpc.man1.getStatus.useQuery(undefined, { refetchInterval: 3000 });
  const briefingQuery = trpc.man1.getBriefing.useQuery(undefined, { refetchInterval: 5000 });
  const approvalsQuery = trpc.man1.getApprovals.useQuery(undefined, { refetchInterval: 3000 });
  const agentStatsQuery = trpc.man1.getAgentStats.useQuery(undefined, { refetchInterval: 3000 });
  const credentialsQuery = trpc.man1.getCredentials.useQuery();
  const leadsQuery = trpc.man1.getLeads.useQuery();
  const faqsQuery = trpc.man1.getFaqs.useQuery();
  const auditLogsQuery = trpc.man1.getAuditLogs.useQuery({ limit: 60 }, { refetchInterval: 4000 });
  const liveEventsQuery = trpc.man1.getLiveEvents.useQuery({ limit: 30 }, { refetchInterval: 5000 });

  const syncLiveMutation = trpc.man1.syncLiveIntegrations.useMutation({
    onSuccess: (data) => {
      void utils.man1.invalidate();
      const summary = `Live sync completed: Ingested Gmail (${data.syncResults.gmail.count}), Instagram (${data.syncResults.instagram.count}), GitHub (${data.syncResults.github.count}), Community (${data.syncResults.community.count})`;
      setIntegrationToast({ service: "Live Pipeline", message: summary, success: true });
      setTimeout(() => setIntegrationToast(null), 6000);
    },
    onError: (err) => {
      setIntegrationToast({ service: "Live Pipeline", message: `Sync error: ${err.message}`, success: false });
      setTimeout(() => setIntegrationToast(null), 6000);
    },
  });

  const setSystemState = trpc.man1.setSystemState.useMutation({
    onSuccess: () => void utils.man1.getStatus.invalidate(),
  });
  const setUserState = trpc.man1.setUserState.useMutation({
    onSuccess: () => {
      void utils.man1.getStatus.invalidate();
      void utils.man1.getBriefing.invalidate();
    },
  });
  const decideApproval = trpc.man1.decideApproval.useMutation({
    onSuccess: () => {
      void utils.man1.getApprovals.invalidate();
      void utils.man1.getStatus.invalidate();
      void utils.man1.getBriefing.invalidate();
      void utils.man1.getAuditLogs.invalidate();
    },
  });
  const updatePermission = trpc.man1.updatePermission.useMutation({
    onSuccess: () => void utils.man1.getStatus.invalidate(),
  });
  const updateCredentials = trpc.man1.updateCredentials.useMutation({
    onSuccess: () => {
      void utils.man1.getCredentials.invalidate();
      void utils.man1.getStatus.invalidate();
      setIntegrationToast({ service: "System", message: "API Credentials & Permissions updated successfully!", success: true });
      setTimeout(() => setIntegrationToast(null), 5000);
    },
  });
  const testIntegration = trpc.man1.testIntegration.useMutation({
    onSuccess: (data) => {
      setIntegrationToast({ service: data.service, message: data.message, success: data.success });
      setTimeout(() => setIntegrationToast(null), 6000);
    },
    onError: (err) => {
      setIntegrationToast({ service: "Handshake", message: `Test failed: ${err.message}`, success: false });
      setTimeout(() => setIntegrationToast(null), 6000);
    },
  });
  const simulateScenario = trpc.man1.simulateReferenceScenario.useMutation({
    onSuccess: () => {
      setSimulating(false);
      setSimulationToast("Reference overnight scenario executed! All 5 agents processed live events.");
      void utils.man1.invalidate();
      setTimeout(() => setSimulationToast(""), 6000);
    },
    onError: () => setSimulating(false),
  });

  const status = statusQuery.data;
  const briefing = briefingQuery.data;
  const approvals = approvalsQuery.data ?? [];
  const pendingApprovals = approvals.filter((a) => a.status === "PENDING");
  const agentStats = agentStatsQuery.data;
  const leads = leadsQuery.data ?? [];
  const faqs = faqsQuery.data ?? [];
  const auditLogs = auditLogsQuery.data ?? [];

  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Jarvis Voice presence & active listening on MAN1 subpage
  useEffect(() => {
    const greeting = "I opened MAN 1, Sir. The autonomous control center is active. What would you like to inspect or execute?";
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(greeting);
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        startVoiceListener();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        startVoiceListener();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      startVoiceListener();
    }

    function startVoiceListener() {
      const win = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = "en-US";
        rec.onstart = () => setIsVoiceListening(true);
        rec.onend = () => {
          setIsVoiceListening(false);
          // Restart listener if still mounted
          setTimeout(() => {
            try { rec.start(); } catch {}
          }, 600);
        };
        rec.onresult = (e: any) => {
          const lastIdx = e.results.length - 1;
          const transcript = e.results[lastIdx]?.[0]?.transcript?.trim().toLowerCase() || "";
          if (transcript.includes("home") || transcript.includes("go back") || transcript.includes("exit")) {
            setLocation("/");
          } else if (transcript.includes("approv")) {
            setActiveTab("approvals");
            speakBriefing("Displaying pending approvals queue.");
          } else if (transcript.includes("brief") || transcript.includes("overview")) {
            setActiveTab("briefing");
            speakBriefing("Displaying executive operational briefing.");
          } else if (transcript.includes("email") || transcript.includes("mail")) {
            setActiveTab("email");
            speakBriefing("Displaying live email pipeline.");
          } else if (transcript.includes("github") || transcript.includes("dev") || transcript.includes("git")) {
            setActiveTab("dev");
            speakBriefing("Displaying developer and CI pipeline telemetry.");
          } else if (transcript.includes("sync") || transcript.includes("refresh")) {
            syncLiveMutation.mutate();
            speakBriefing("Triggering live multi-channel synchronization.");
          } else if (transcript.includes("morning call")) {
            setIsMorningCallOpen(true);
          } else if (transcript.includes("trace")) {
            setLocation("/trace");
          }
        };
        rec.start();
        recognitionRef.current = rec;
      } catch {}
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakBriefing = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleRunSimulation = () => {
    setSimulating(true);
    simulateScenario.mutate();
  };

  return (
    <main className="min-h-screen bg-[#071018] text-slate-100 selection:bg-cyan-300 selection:text-[#071018]">
      {/* Top Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(6,182,212,0.12),transparent_70%)]" />

      {/* Header Bar */}
      <header className="relative z-20 border-b border-white/[0.08] bg-[#08131d]/90 px-4 py-3.5 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:bg-white/[0.07] hover:text-white"
              onClick={() => setLocation("/")}
              aria-label="Back to JARVIS Home"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-[0.3em] text-cyan-300">JARVIS</span>
                <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest text-cyan-200">
                  MAN1
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Autonomous Personal Operations Layer</p>
            </div>
          </div>

          {/* System Mode & User State Switchers */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/ai-builder")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <Brain className="size-3.5 text-cyan-400 animate-pulse" />
              <span>AI Builder Studio</span>
            </button>

            {/* System Autonomy Switch */}
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs">
              <button
                type="button"
                onClick={() => setSystemState.mutate({ state: "ACTIVE" })}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  status?.systemState === "ACTIVE"
                    ? "bg-cyan-300 text-[#071018] shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Play className="size-3" /> Active
              </button>
              <button
                type="button"
                onClick={() => setSystemState.mutate({ state: "PAUSED" })}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  status?.systemState === "PAUSED"
                    ? "bg-amber-400 text-[#071018] shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Pause className="size-3" /> Pause
              </button>
              <button
                type="button"
                onClick={() => setSystemState.mutate({ state: "STOPPED" })}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  status?.systemState === "STOPPED"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <AlertOctagon className="size-3" /> Stop
              </button>
            </div>

            {/* User Operational State Switcher */}
            <div className="hidden items-center rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs sm:flex">
              <button
                type="button"
                onClick={() => setUserState.mutate({ state: "USER_AWAKE" })}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] transition ${
                  status?.userState === "USER_AWAKE"
                    ? "bg-white/15 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="User is active & present"
              >
                <Sun className="size-3 text-amber-300" /> Awake
              </button>
              <button
                type="button"
                onClick={() => setUserState.mutate({ state: "USER_AWAY" })}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] transition ${
                  status?.userState === "USER_AWAY"
                    ? "bg-white/15 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="User is away; JARVIS operates silently in background"
              >
                <Radio className="size-3 text-cyan-300" /> Away
              </button>
              <button
                type="button"
                onClick={() => setUserState.mutate({ state: "USER_SLEEPING" })}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] transition ${
                  status?.userState === "USER_SLEEPING"
                    ? "bg-white/15 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="User is sleeping; prepares Morning Briefing"
              >
                <Moon className="size-3 text-violet-300" /> Asleep
              </button>
            </div>

            {/* POV 6:00 AM Morning Call Launcher */}
            <Button
              size="sm"
              onClick={() => setIsMorningCallOpen(true)}
              className="gap-1.5 border border-emerald-400/40 bg-emerald-500/20 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 shadow-lg shadow-emerald-500/20"
            >
              <PhoneCall className="size-3.5 animate-pulse text-emerald-400" />
              <span>POV: 6:00 AM Call</span>
            </Button>

            {/* Live Integrations Sync Button */}
            <Button
              size="sm"
              disabled={syncLiveMutation.isPending}
              onClick={() => syncLiveMutation.mutate()}
              className="gap-1.5 border border-amber-400/40 bg-amber-500/20 text-xs font-bold text-amber-300 hover:bg-amber-500/30 shadow-lg shadow-amber-500/20"
            >
              <Zap className={`size-3.5 text-amber-400 ${syncLiveMutation.isPending ? "animate-spin" : "animate-pulse"}`} />
              <span>{syncLiveMutation.isPending ? "Ingesting..." : "Sync Live Channels"}</span>
            </Button>

            {/* Run Scenario Simulator Button */}
            <Button
              size="sm"
              variant="outline"
              disabled={simulating}
              onClick={handleRunSimulation}
              className="gap-1.5 border-cyan-300/30 bg-cyan-300/10 text-xs text-cyan-200 hover:bg-cyan-300/20"
            >
              <Sparkles className="size-3.5 text-cyan-300" />
              {simulating ? "Simulating..." : "Run Reference Scenario"}
            </Button>
          </div>
        </div>
      </header>

      {/* Simulation Toast */}
      {simulationToast && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-[#0c1f2d] p-4 text-xs text-emerald-200 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2">
          <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
          <span>{simulationToast}</span>
        </div>
      )}

      {/* Integration Toast */}
      {integrationToast && (
        <div className={`fixed top-20 right-8 z-50 flex items-center gap-3 rounded-2xl border p-4 text-xs shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 ${
          integrationToast.success
            ? "border-emerald-400/40 bg-[#071d18] text-emerald-200"
            : "border-rose-400/40 bg-[#1d070b] text-rose-200"
        }`}>
          {integrationToast.success ? (
            <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="size-5 text-rose-400 shrink-0" />
          )}
          <div>
            <p className="font-bold text-white">{integrationToast.service}</p>
            <p>{integrationToast.message}</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-8">
        {/* KPI Metrics Row */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-white/10 bg-[#0b1823]/80 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Events Today</span>
              <Activity className="size-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{status?.eventsProcessedToday ?? 0}</p>
            <p className="mt-1 text-[10px] text-slate-500">Across 5 channels</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b1823]/80 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Auto Actions</span>
              <Zap className="size-4 text-amber-300" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-300">{status?.autonomousActions ?? 0}</p>
            <p className="mt-1 text-[10px] text-slate-500">Autonomous replies sent</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b1823]/80 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Approvals</span>
              <ShieldAlert className="size-4 text-rose-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-300">{pendingApprovals.length}</p>
            <p className="mt-1 text-[10px] text-slate-500">Human-in-the-loop</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b1823]/80 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Leads Tracked</span>
              <TrendingUp className="size-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{agentStats?.instagram.convertedCount ?? leads.length}</p>
            <p className="mt-1 text-[10px] text-slate-500">{agentStats?.instagram.conversionRatePercent ?? 30.4}% conversion</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b1823]/80 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Active Tasks</span>
              <ListTodo className="size-4 text-violet-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-violet-300">{agentStats?.tasks.active ?? 0}</p>
            <p className="mt-1 text-[10px] text-slate-500">Proactive follow-ups</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b1823]/80 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">CI / Fix Tests</span>
              <CheckCircle2 className="size-4 text-cyan-300" />
            </div>
            <p className="mt-2 text-2xl font-bold text-cyan-300">4 / 4 Passed</p>
            <p className="mt-1 text-[10px] text-slate-500">TC Fix at {agentStats?.dev.lastFix?.pushedTime ?? "02:14 AM"}</p>
          </div>
        </section>

        {/* Navigation Tabs */}
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-[#08131d]/90 p-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveTab("briefing")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "briefing"
                ? "bg-cyan-300 text-[#071018] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Bot className="size-3.5" /> Executive Briefing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("approvals")}
            className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "approvals"
                ? "bg-cyan-300 text-[#071018] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="size-3.5" /> Approvals Queue
            {pendingApprovals.length > 0 && (
              <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendingApprovals.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "email"
                ? "bg-cyan-300 text-[#071018] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="size-3.5" /> Email ({agentStats?.email.received ?? 38})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("instagram")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "instagram"
                ? "bg-cyan-300 text-[#071018] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Instagram className="size-3.5" /> Instagram & Leads ({agentStats?.instagram.dmsReceived ?? 322})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("community")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "community"
                ? "bg-cyan-300 text-[#071018] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="size-3.5" /> Community Q&A
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dev")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "dev"
                ? "bg-cyan-300 text-[#071018] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Code2 className="size-3.5" /> Dev & CI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "tasks"
                ? "bg-cyan-300 text-[#071018] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ListTodo className="size-3.5" /> Tasks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("credentials")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "credentials"
                ? "bg-amber-400 text-[#071018] shadow-md font-bold"
                : "text-amber-300/80 hover:text-amber-200"
            }`}
          >
            <Key className="size-3.5" /> API Keys & Permissions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("policies")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "policies"
                ? "bg-cyan-300 text-[#071018] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Lock className="size-3.5" /> Policies & FAQs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              activeTab === "audit"
                ? "bg-cyan-300 text-[#071018] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="size-3.5" /> Action Audit Log
          </button>
        </nav>

        {/* TAB 1: EXECUTIVE BRIEFING */}
        {activeTab === "briefing" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#0c2233] to-[#071520] p-6 shadow-2xl md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Sparkles className="size-4 animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em]">
                      Autonomous Operations Report
                    </span>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
                    {briefing?.userStateDuringPeriod === "USER_SLEEPING"
                      ? "Good Morning. Here is your overnight operational briefing."
                      : "Welcome Back. Here is your operational briefing."}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Generated autonomously while user was in {briefing?.userStateDuringPeriod} mode.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => speakBriefing(briefing?.voiceScript || "")}
                    className={`gap-2 ${
                      speaking
                        ? "bg-rose-500 text-white hover:bg-rose-600"
                        : "bg-cyan-300 text-[#071018] hover:bg-cyan-200"
                    }`}
                  >
                    {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                    {speaking ? "Stop Spoken Briefing" : "Read Briefing Aloud"}
                  </Button>
                </div>
              </div>

              {/* Natural Voice Transcript Box */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                <div className="mb-2 flex items-center justify-between text-xs text-cyan-300">
                  <span className="font-semibold uppercase tracking-wider">JARVIS Voice Delivery Script</span>
                  <span className="text-[10px] text-slate-500">Synthesized Speech Ready</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200">{briefing?.voiceScript}</p>
              </div>

              {/* POV: 6:00 AM Wakeup Call Feature Card */}
              <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-950/40 via-[#0a1e1b]/60 to-[#071319]/80 p-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md">
                      <PhoneCall className="size-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                          OVERNIGHT CALL TELEMETRY
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                          6:00 AM WAKE-UP
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        "POV: Jarvis calls you at 6:00 am with the overnight report"
                      </h3>
                      <p className="text-xs text-slate-300 max-w-xl">
                        Simulate the phone call experience from the reference video: fast bullet breakdown of {agentStats?.email.received ?? 38} emails, {agentStats?.instagram.dmsReceived ?? 322} DMs ({agentStats?.instagram.leadsIdentified ?? 98} signups), TC fix verification at 2:14 AM, and community support.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsMorningCallOpen(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/30 gap-2"
                  >
                    <Phone className="size-4" />
                    <span>Launch 6:00 AM Call Experience</span>
                  </Button>
                </div>
              </div>

              {/* High-Resolution Real Statistics Grid from Every Side */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Email & Sentiment Breakdown */}
                <div className="rounded-2xl border border-cyan-400/20 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-300 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-4" />
                      <span className="font-bold">EMAIL & SENTIMENT</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      100% PEACEFUL
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono mb-1">
                    {agentStats?.email.received ?? 38} <span className="text-xs font-normal text-slate-400">received</span>
                  </div>
                  <p className="text-xs text-emerald-300 font-semibold mb-2">
                    ✓ Nobody is mad at you (0 negative)
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-300 border-t border-white/10 pt-2 font-mono">
                    <div className="flex justify-between">
                      <span>Drafted Awaiting Review:</span>
                      <span className="font-bold text-amber-300">{agentStats?.email.requiresApproval ?? 11}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto-Labeled & Read:</span>
                      <span className="text-slate-400">{ (agentStats?.email.received ?? 38) - (agentStats?.email.requiresApproval ?? 11) }</span>
                    </div>
                  </div>
                </div>

                {/* Instagram & Social Conversion Funnel */}
                <div className="rounded-2xl border border-pink-400/20 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-xs font-mono text-pink-300 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Instagram className="size-4" />
                      <span className="font-bold">DMS & CONVERSIONS</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold">
                      {agentStats?.instagram.conversionRatePercent ?? 30.4}% RATE
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono mb-1">
                    {agentStats?.instagram.leadsIdentified ?? 98} <span className="text-xs font-normal text-slate-400">signups</span>
                  </div>
                  <p className="text-xs text-pink-200 font-semibold mb-2">
                    From {agentStats?.instagram.dmsReceived ?? 322} AI agent queries
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-300 border-t border-white/10 pt-2 font-mono">
                    <div className="flex justify-between">
                      <span>Blueprint Links Sent:</span>
                      <span className="font-bold text-pink-300">{agentStats?.instagram.responsesSent ?? 322}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conversion Funnel:</span>
                      <span className="text-emerald-400">98 / 322 ({agentStats?.instagram.conversionRatePercent ?? 30.4}%)</span>
                    </div>
                  </div>
                </div>

                {/* Dev Commit & Automated Test Verification */}
                <div className="rounded-2xl border border-amber-400/20 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-xs font-mono text-amber-300 mb-2">
                    <div className="flex items-center gap-1.5">
                      <GitCommit className="size-4" />
                      <span className="font-bold">DEV & CI STATUS</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      CI PASSED
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono mb-1">
                    TC Fix <span className="text-xs font-normal text-slate-400">at 02:14 AM</span>
                  </div>
                  <p className="text-xs text-emerald-300 font-semibold mb-2">
                    ✓ Tested 4 times. It works.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-300 border-t border-white/10 pt-2 font-mono">
                    <div className="flex justify-between">
                      <span>Repo:</span>
                      <span className="text-cyan-300">azaris-core (main)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Automated Test Runs:</span>
                      <span className="font-bold text-emerald-400">4 / 4 (100%)</span>
                    </div>
                  </div>
                </div>

                {/* Community & Sleep Schedule */}
                <div className="rounded-2xl border border-purple-400/20 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-xs font-mono text-purple-300 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="size-4" />
                      <span className="font-bold">COMMUNITY & SLEEP</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                      TRIAGED
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono mb-1">
                    3 Questions <span className="text-xs font-normal text-slate-400">triaged</span>
                  </div>
                  <p className="text-xs text-purple-200 font-semibold mb-2">
                    2 auto-answered • 1 billing for you
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-300 border-t border-white/10 pt-2 font-mono">
                    <div className="flex justify-between">
                      <span>Sleep Duration:</span>
                      <span className="text-cyan-300">10:40 PM → 6:00 AM (7h 20m)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Scheduled Call:</span>
                      <span className="text-emerald-400">8:00 AM (Day Plan)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Bullet Points */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {briefing?.summaryBullets.map((bullet, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-xs text-slate-200"
                  >
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions & Pending Escalations Alert */}
            {pendingApprovals.length > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="size-6 text-rose-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {pendingApprovals.length} item{pendingApprovals.length > 1 ? "s" : ""} require your approval
                    </h3>
                    <p className="text-xs text-slate-400">
                      Sensitive or financial requests are quarantined in the human-in-the-loop queue.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-rose-500 text-white hover:bg-rose-600"
                  onClick={() => setActiveTab("approvals")}
                >
                  Review Approvals
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: APPROVALS QUEUE */}
        {activeTab === "approvals" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Human-In-The-Loop Approval Queue</h2>
                <p className="text-xs text-slate-400">
                  Consequential actions requiring your explicit authorization before execution.
                </p>
              </div>
              <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-300">
                {pendingApprovals.length} Pending
              </span>
            </div>

            {approvals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-sm text-slate-500">
                No approval requests in the queue. All autonomous actions satisfied safety policies.
              </div>
            ) : (
              <div className="space-y-3">
                {approvals.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-5 transition ${
                      item.status === "PENDING"
                        ? "border-rose-400/30 bg-[#0f1d2a]"
                        : "border-white/10 bg-[#08131d]/60 opacity-70"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              item.riskLevel === "CRITICAL" || item.riskLevel === "HIGH"
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-amber-400/20 text-amber-300"
                            }`}
                          >
                            {item.riskLevel} RISK
                          </span>
                          <span className="text-xs font-medium text-cyan-300">[{item.agent}]</span>
                          <span className="text-xs font-semibold text-white">{item.title}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-300">{item.reason}</p>
                        <div className="mt-3 rounded-lg bg-black/30 p-3 text-xs text-slate-400 font-mono">
                          <span className="text-cyan-400">Proposed Action:</span> {item.proposedAction}
                        </div>
                      </div>

                      {item.status === "PENDING" ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-400 text-[#071018] hover:bg-emerald-300"
                            disabled={decideApproval.isPending}
                            onClick={() => decideApproval.mutate({ id: item.id, decision: "APPROVED" })}
                          >
                            <Check className="size-3.5" /> Approve & Execute
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-400/30 text-rose-300 hover:bg-rose-400/10"
                            disabled={decideApproval.isPending}
                            onClick={() => decideApproval.mutate({ id: item.id, decision: "REJECTED" })}
                          >
                            <X className="size-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                              item.status === "APPROVED"
                                ? "bg-emerald-400/20 text-emerald-300"
                                : "bg-rose-400/20 text-rose-300"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EMAIL AGENT */}
        {activeTab === "email" && (
          <div className="space-y-6">
            {/* Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-[#0b1823] p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Received</p>
                <p className="mt-1 text-2xl font-bold text-white">{agentStats?.email.received ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1823] p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">No Action</p>
                <p className="mt-1 text-2xl font-bold text-slate-400">{agentStats?.email.noAction ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1823] p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Informational</p>
                <p className="mt-1 text-2xl font-bold text-cyan-300">{agentStats?.email.informational ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1823] p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Auto-Replied</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">{agentStats?.email.routineReplies ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1823] p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Requires Approval</p>
                <p className="mt-1 text-2xl font-bold text-rose-300">{agentStats?.email.requiresApproval ?? 0}</p>
              </div>
            </div>

            {/* Email Actions Log */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">Email Actions & Decisions</h3>
              <div className="space-y-2">
                {agentStats?.email.recentActions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-xs text-slate-500">
                    No recent email processing logs. Click "Run Reference Scenario" to test.
                  </p>
                ) : (
                  agentStats?.email.recentActions.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1823]/90 p-3.5 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate">{item.subject}</span>
                          <span className="text-[10px] text-slate-400">from {item.from}</span>
                        </div>
                        {item.response && (
                          <p className="mt-1.5 rounded bg-black/30 p-2 font-mono text-[11px] text-slate-300">
                            <span className="text-cyan-300">Reply:</span> {item.response}
                          </p>
                        )}
                      </div>
                      <span
                        className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${
                          item.action === "AUTO_REPLIED"
                            ? "bg-emerald-400/20 text-emerald-300"
                            : item.action === "ESCALATED"
                            ? "bg-rose-400/20 text-rose-300"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INSTAGRAM & LEADS */}
        {activeTab === "instagram" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-cyan-300/20 bg-[#0c1f2d] p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <Flame className="size-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Automated FAQ Pattern Detected
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold text-white">
                {agentStats?.instagram.dmsReceived ?? 0} Direct Messages Processed
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Topic: "How to build an AI agent". Automated responses sent with approved repository blueprints to{" "}
                {agentStats?.instagram.responsesSent ?? 0} prospective leads without manual intervention.
              </p>
            </div>

            {/* Lead Tracking Funnel */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">Active Lead Ingestion Funnel</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {leads.length === 0 ? (
                  <p className="col-span-full rounded-xl border border-dashed border-white/15 p-8 text-center text-xs text-slate-500">
                    No leads detected yet. Run the reference simulation to populate the pipeline.
                  </p>
                ) : (
                  leads.map((lead) => (
                    <div key={lead.id} className="rounded-xl border border-white/10 bg-[#0b1823] p-4 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-cyan-300">@{lead.username}</span>
                        <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          {lead.status}
                        </span>
                      </div>
                      <p className="mt-2 text-slate-300">{lead.notes}</p>
                      {lead.linkSent && (
                        <p className="mt-2 truncate text-[10px] text-slate-500">Link: {lead.linkSent}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: COMMUNITY Q&A */}
        {activeTab === "community" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Community & Support Ingestion</h2>
            <div className="space-y-2">
              {agentStats?.community.recentQuestions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-xs text-slate-500">
                  No recent community questions. Run the reference simulation to view sample stream.
                </p>
              ) : (
                agentStats?.community.recentQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-white/10 bg-[#0b1823] p-4 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{q.author}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          q.status.includes("Escalated")
                            ? "bg-rose-400/20 text-rose-300"
                            : "bg-emerald-400/20 text-emerald-300"
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-300">"{q.question}"</p>
                    <div className="mt-2 rounded bg-black/30 p-2.5 text-slate-400">
                      <span className="text-cyan-300">Resolution:</span> {q.resolution}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: DEV & CI */}
        {activeTab === "dev" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Software & CI/CD Pipeline Monitoring</h2>
            <div className="space-y-2">
              {agentStats?.dev.recentEvents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-xs text-slate-500">
                  No development commits recorded.
                </p>
              ) : (
                agentStats?.dev.recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1823] p-4 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <GitCommit className="size-4 text-cyan-300" />
                        <span className="font-semibold text-white">{evt.commitMessage}</span>
                        <span className="text-slate-500">({evt.repo}/{evt.branch})</span>
                      </div>
                      <p className="mt-1 text-slate-400">Pushed by {evt.author} • {evt.deploymentStatus}</p>
                    </div>
                    <span className="rounded bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                      CI: {evt.ciStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 7: TASKS */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Proactive Follow-ups & Task Reminders</h2>
            <div className="space-y-2">
              {agentStats?.tasks.recentTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b1823] p-4 text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">{t.title}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Origin: {t.origin} • Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "Flexible"}
                    </p>
                  </div>
                  <span className="rounded bg-cyan-400/20 px-2.5 py-1 text-[10px] font-semibold text-cyan-300">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: POLICIES & FAQS */}
        {activeTab === "policies" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0b1823] p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">Granular Autonomy Permissions</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {status?.permissions &&
                  Object.entries(status.permissions).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs"
                    >
                      <span className="font-mono text-slate-300">{key}</span>
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) =>
                          updatePermission.mutate({ key: key as any, value: e.target.checked })
                        }
                        className="size-4 accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">Approved Knowledge Base & FAQs</h3>
              <div className="space-y-2">
                {faqs.map((faq) => (
                  <div key={faq.id} className="rounded-xl border border-white/10 bg-[#0b1823] p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-300">{faq.topic}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          faq.autoReplyAllowed ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300"
                        }`}
                      >
                        {faq.autoReplyAllowed ? "Auto-Reply Allowed" : "Requires Approval"}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-300">{faq.approvedAnswer}</p>
                    {faq.approvedLink && (
                      <p className="mt-2 text-[10px] text-cyan-400">Verified URL: {faq.approvedLink}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: API KEYS & REAL PERMISSIONS MANAGER */}
        {activeTab === "credentials" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header / Mode Switcher */}
            <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-[#1a1409] via-[#0d161f] to-[#07111b] p-6 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-300 font-mono text-xs font-bold uppercase tracking-widest">
                    <Key className="size-4 text-amber-400" />
                    <span>MAN1 LIVE CREDENTIALS & PERMISSIONS ENGINE</span>
                  </div>
                  <h2 className="mt-1 text-2xl font-extrabold text-white tracking-tight">
                    API Permissions & Real Integration Pipelines
                  </h2>
                  <p className="mt-1 text-xs text-slate-300 max-w-2xl">
                    Configure real API keys, tokens, and webhooks for live multi-channel data ingestion (Gmail, Instagram Meta Graph, GitHub CI/CD, Discord/Slack).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">INGESTION MODE:</span>
                  <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-1 text-xs">
                    {(["REAL_INGESTION", "HYBRID", "SIMULATED"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateCredentials.mutate({ mode: m })}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                          credentialsQuery.data?.mode === m
                            ? "bg-amber-400 text-black font-bold shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {m === "REAL_INGESTION" ? "⚡ Live APIs" : m === "HYBRID" ? "Hybrid" : "Simulated"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Grid of 4 Integration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Gmail / Email API */}
              <div className="rounded-2xl border border-white/10 bg-[#0a1622] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                      <Mail className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Gmail / Email API</h3>
                      <p className="text-[11px] text-slate-400">Inbox polling, auto-labeling & drafted replies</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    credentialsQuery.data?.gmail.status === "CONNECTED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  }`}>
                    {credentialsQuery.data?.gmail.status || "SIMULATED"}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">GMAIL EMAIL ADDRESS</label>
                    <input
                      type="email"
                      defaultValue={credentialsQuery.data?.gmail.emailAddress || ""}
                      placeholder="founder@company.com"
                      id="gmail-email-input"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">APP PASSWORD / TOKEN</label>
                    <input
                      type="password"
                      defaultValue={credentialsQuery.data?.gmail.appPassword || ""}
                      placeholder="16-character Google App Password"
                      id="gmail-pass-input"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testIntegration.mutate({ service: "gmail" })}
                    disabled={testIntegration.isPending}
                    className="border-white/15 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Test Connection
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const emailInput = document.getElementById("gmail-email-input") as HTMLInputElement;
                      const passInput = document.getElementById("gmail-pass-input") as HTMLInputElement;
                      updateCredentials.mutate({
                        gmail: {
                          emailAddress: emailInput?.value,
                          appPassword: passInput?.value,
                          enabled: true,
                        },
                      });
                    }}
                    disabled={updateCredentials.isPending}
                    className="bg-cyan-400 text-black hover:bg-cyan-300 text-xs font-bold"
                  >
                    Save Gmail
                  </Button>
                </div>
              </div>

              {/* Card 2: Instagram Meta Graph API */}
              <div className="rounded-2xl border border-white/10 bg-[#0a1622] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300">
                      <Instagram className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Instagram Meta Graph API</h3>
                      <p className="text-[11px] text-slate-400">DM auto-replies & blueprint lead conversion funnel</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    credentialsQuery.data?.instagram.status === "CONNECTED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  }`}>
                    {credentialsQuery.data?.instagram.status || "SIMULATED"}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">META ACCESS TOKEN</label>
                    <input
                      type="password"
                      defaultValue={credentialsQuery.data?.instagram.accessToken || ""}
                      placeholder="EAA..."
                      id="ig-token-input"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-slate-600 focus:border-pink-400 focus:outline-none font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">INSTAGRAM PAGE ID</label>
                    <input
                      type="text"
                      defaultValue={credentialsQuery.data?.instagram.pageId || ""}
                      placeholder="17841400..."
                      id="ig-page-input"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-slate-600 focus:border-pink-400 focus:outline-none font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testIntegration.mutate({ service: "instagram" })}
                    disabled={testIntegration.isPending}
                    className="border-white/15 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Test Webhook
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const tokenInput = document.getElementById("ig-token-input") as HTMLInputElement;
                      const pageInput = document.getElementById("ig-page-input") as HTMLInputElement;
                      updateCredentials.mutate({
                        instagram: {
                          accessToken: tokenInput?.value,
                          pageId: pageInput?.value,
                          enabled: true,
                        },
                      });
                    }}
                    disabled={updateCredentials.isPending}
                    className="bg-pink-400 text-black hover:bg-pink-300 text-xs font-bold"
                  >
                    Save Instagram
                  </Button>
                </div>
              </div>

              {/* Card 3: GitHub CI/CD & Deployments */}
              <div className="rounded-2xl border border-white/10 bg-[#0a1622] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                      <GitCommit className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">GitHub API & CI/CD</h3>
                      <p className="text-[11px] text-slate-400">Live commits, fix tracking, and automated CI test runs</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    credentialsQuery.data?.github.status === "CONNECTED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  }`}>
                    {credentialsQuery.data?.github.status || "SIMULATED"}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">PERSONAL ACCESS TOKEN (PAT)</label>
                    <input
                      type="password"
                      defaultValue={credentialsQuery.data?.github.personalAccessToken || ""}
                      placeholder="ghp_..."
                      id="gh-pat-input"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none font-mono text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 font-mono text-[11px] mb-1">REPO OWNER</label>
                      <input
                        type="text"
                        defaultValue={credentialsQuery.data?.github.repoOwner || "owner"}
                        id="gh-owner-input"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-mono text-[11px] mb-1">REPO NAME</label>
                      <input
                        type="text"
                        defaultValue={credentialsQuery.data?.github.repoName || "azaris-core"}
                        id="gh-repo-input"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testIntegration.mutate({ service: "github" })}
                    disabled={testIntegration.isPending}
                    className="border-white/15 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Test CI Webhook
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const patInput = document.getElementById("gh-pat-input") as HTMLInputElement;
                      const ownerInput = document.getElementById("gh-owner-input") as HTMLInputElement;
                      const repoInput = document.getElementById("gh-repo-input") as HTMLInputElement;
                      updateCredentials.mutate({
                        github: {
                          personalAccessToken: patInput?.value,
                          repoOwner: ownerInput?.value,
                          repoName: repoInput?.value,
                          enabled: true,
                        },
                      });
                    }}
                    disabled={updateCredentials.isPending}
                    className="bg-amber-400 text-black hover:bg-amber-300 text-xs font-bold"
                  >
                    Save GitHub
                  </Button>
                </div>
              </div>

              {/* Card 4: Discord / Slack Community Relay */}
              <div className="rounded-2xl border border-white/10 bg-[#0a1622] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                      <Users className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Community Forum & Relay</h3>
                      <p className="text-[11px] text-slate-400">Discord / Slack / Telegram Q&A auto-triage</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    credentialsQuery.data?.community.status === "CONNECTED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  }`}>
                    {credentialsQuery.data?.community.status || "SIMULATED"}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">BOT TOKEN</label>
                    <input
                      type="password"
                      defaultValue={credentialsQuery.data?.community.botToken || ""}
                      placeholder="Bot Token..."
                      id="comm-token-input"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-slate-600 focus:border-purple-400 focus:outline-none font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono text-[11px] mb-1">CHANNEL ID / WEBHOOK</label>
                    <input
                      type="text"
                      defaultValue={credentialsQuery.data?.community.channelId || ""}
                      placeholder="10482910..."
                      id="comm-channel-input"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-slate-600 focus:border-purple-400 focus:outline-none font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testIntegration.mutate({ service: "community" })}
                    disabled={testIntegration.isPending}
                    className="border-white/15 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Test Relay
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const tokenInput = document.getElementById("comm-token-input") as HTMLInputElement;
                      const channelInput = document.getElementById("comm-channel-input") as HTMLInputElement;
                      updateCredentials.mutate({
                        community: {
                          botToken: tokenInput?.value,
                          channelId: channelInput?.value,
                          platform: "discord",
                          enabled: true,
                        },
                      });
                    }}
                    disabled={updateCredentials.isPending}
                    className="bg-purple-400 text-black hover:bg-purple-300 text-xs font-bold"
                  >
                    Save Community
                  </Button>
                </div>
              </div>
            </div>

            {/* Live Ingestion Activity Stream */}
            <div className="rounded-3xl border border-white/10 bg-[#08131e] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-cyan-400/20 flex items-center justify-center text-cyan-300">
                    <Activity className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Live Ingested Multi-Channel Stream</h3>
                    <p className="text-xs text-slate-400">
                      Real-time events fetched directly from connected Gmail, Instagram, GitHub, and Discord/Slack pipelines
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-cyan-300">
                    {liveEventsQuery.data?.length || 0} LIVE EVENTS BUFFERED
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => liveEventsQuery.refetch()}
                    className="border-white/15 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Refresh Stream
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {(!liveEventsQuery.data || liveEventsQuery.data.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                    <p className="text-xs text-slate-400">
                      No live events ingested yet. Click <span className="text-amber-300 font-bold">"Sync Live Channels"</span> in the header to poll your connected accounts or trigger reference events.
                    </p>
                  </div>
                ) : (
                  liveEventsQuery.data.map((evt) => (
                    <div
                      key={evt.event_id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#0b1824] p-4 text-xs hover:border-cyan-400/30 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          evt.source === "EMAIL"
                            ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                            : evt.source === "INSTAGRAM"
                            ? "bg-pink-400/20 text-pink-300 border border-pink-400/30"
                            : evt.source === "GITHUB"
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                            : "bg-purple-400/20 text-purple-300 border border-purple-400/30"
                        }`}>
                          {evt.source}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{evt.actor.name || evt.actor.id}</span>
                            <span className="text-[10px] font-mono text-slate-500">({evt.event_type})</span>
                          </div>
                          <p className="text-slate-300 mt-0.5 line-clamp-1">
                            {evt.content.title ? `${evt.content.title} — ` : ""}{evt.content.text}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                          {evt.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive 6:00 AM Morning POV Call Modal */}
      <MorningCallModal
        isOpen={isMorningCallOpen}
        onClose={() => setIsMorningCallOpen(false)}
        briefing={briefing}
        agentStats={agentStats}
      />
    </main>
  );
}
