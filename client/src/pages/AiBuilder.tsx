import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Brain,
  Cpu,
  Database,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Square,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCode,
  Terminal,
  Activity,
  HardDrive,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  Send,
  Mic,
  MicOff,
  Sliders,
  Check,
  Zap,
  ExternalLink,
  ChevronRight,
  Code2,
  Clock,
  Flame,
  HelpCircle,
  Wrench,
  Search,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { toast } from "sonner";
import { JarvisOrb } from "./Home";

type ActiveTab =
  | "dashboard"
  | "new_project"
  | "projects"
  | "training"
  | "builds"
  | "models_data"
  | "errors_repair"
  | "settings";

export default function AiBuilder() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  // New Project State
  const [promptInput, setPromptInput] = useState(
    "Create an AI model that understands Telugu and English, use my dataset from the AI folder, fine-tune an appropriate open model, test it, and save everything in my Projects folder."
  );
  const [isListening, setIsListening] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>("telugu_eng");
  const [customProjectName, setCustomProjectName] = useState("");
  const [selectedProjectType, setSelectedProjectType] = useState<any>("LLM_FINE_TUNING");
  const [selectedModelFamily, setSelectedModelFamily] = useState("Qwen 2.5 (1.5B)");

  // Live query invalidation
  const utils = trpc.useUtils();

  // Queries
  const statusQuery = trpc.aiBuilder.getStatus.useQuery(undefined, { refetchInterval: 2500 });
  const hardwareQuery = trpc.aiBuilder.getHardwareProfile.useQuery(undefined, { refetchInterval: 5000 });
  const projectsQuery = trpc.aiBuilder.listProjects.useQuery();
  const buildsQuery = trpc.aiBuilder.listBuilds.useQuery();
  const trainingJobsQuery = trpc.aiBuilder.listTrainingJobs.useQuery(undefined, { refetchInterval: 1500 });
  const datasetsQuery = trpc.aiBuilder.listDatasets.useQuery();
  const modelsQuery = trpc.aiBuilder.listModels.useQuery();
  const approvalsQuery = trpc.aiBuilder.listApprovals.useQuery(undefined, { refetchInterval: 3000 });
  const logsQuery = trpc.aiBuilder.getLogs.useQuery({ limit: 40 }, { refetchInterval: 3000 });
  const errorsQuery = trpc.aiBuilder.getErrors.useQuery(undefined, { refetchInterval: 3000 });

  // Selected project resolution
  const activeProject =
    (selectedProjectId
      ? projectsQuery.data?.find((p) => p.id === selectedProjectId)
      : statusQuery.data?.activeProject) || projectsQuery.data?.[0];

  // Active training job resolution
  const activeJob =
    trainingJobsQuery.data?.find((j) => j.status === "RUNNING") ||
    trainingJobsQuery.data?.[0] ||
    statusQuery.data?.activeJob;

  // Mutations
  const createProjectMutation = trpc.aiBuilder.createProjectFromPrompt.useMutation({
    onSuccess: (data) => {
      toast.success(`AI Project '${data.project.name}' initialized!`);
      setSelectedProjectId(data.project.id);
      void utils.aiBuilder.invalidate();
      setActiveTab("projects");
    },
    onError: (err) => {
      toast.error(`Project creation failed: ${err.message}`);
    },
  });

  const executeStepMutation = trpc.aiBuilder.executeStep.useMutation({
    onSuccess: () => {
      void utils.aiBuilder.invalidate();
      toast.success("Plan step executed.");
    },
  });

  const runFullPlanMutation = trpc.aiBuilder.runFullPlan.useMutation({
    onSuccess: (data) => {
      toast.success(`Autonomous pipeline completed for ${data.project.name}!`);
      void utils.aiBuilder.invalidate();
    },
  });

  const startTrainingMutation = trpc.aiBuilder.startTraining.useMutation({
    onSuccess: () => {
      toast.success("Training loop started on local CUDA engine.");
      void utils.aiBuilder.invalidate();
    },
  });

  const pauseTrainingMutation = trpc.aiBuilder.pauseTraining.useMutation({
    onSuccess: () => {
      toast.info("Training paused. Checkpoint saved.");
      void utils.aiBuilder.invalidate();
    },
  });

  const resumeTrainingMutation = trpc.aiBuilder.resumeTraining.useMutation({
    onSuccess: () => {
      toast.success("Resumed training loop.");
      void utils.aiBuilder.invalidate();
    },
  });

  const stopTrainingMutation = trpc.aiBuilder.stopTraining.useMutation({
    onSuccess: () => {
      toast.warn("Training stopped.");
      void utils.aiBuilder.invalidate();
    },
  });

  const restartTrainingMutation = trpc.aiBuilder.restartTraining.useMutation({
    onSuccess: () => {
      toast.success("Restarting training from epoch 1.");
      void utils.aiBuilder.invalidate();
    },
  });

  const emergencyStopMutation = trpc.aiBuilder.emergencyStop.useMutation({
    onSuccess: (data) => {
      if (data.emergencyStopped) {
        toast.error("EMERGENCY STOP ACTIVATED: All training and processes killed.");
      } else {
        toast.success("Emergency stop cleared. Ready for operations.");
      }
      void utils.aiBuilder.invalidate();
    },
  });

  const decideApprovalMutation = trpc.aiBuilder.decideApproval.useMutation({
    onSuccess: () => {
      void utils.aiBuilder.invalidate();
      toast.success("Approval decision recorded.");
    },
  });

  const selfRepairMutation = trpc.aiBuilder.requestSelfRepair.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Self-Repair: ${data.message}`);
      } else {
        toast.error(`Self-Repair Escalation: ${data.message}`);
      }
      void utils.aiBuilder.invalidate();
    },
  });

  const launchAppMutation = trpc.aiBuilder.launchApp.useMutation({
    onSuccess: (data) => {
      toast.info(data.message);
    },
  });

  const voiceCommandMutation = trpc.aiBuilder.voiceCommand.useMutation({
    onSuccess: (data) => {
      toast.success(`JARVIS: "${data.spokenResponse}"`);
      void utils.aiBuilder.invalidate();
    },
  });

  // Voice toggle simulation
  const handleVoiceToggle = () => {
    if (!isListening) {
      setIsListening(true);
      toast.info("JARVIS is listening for AI Builder instructions...");
      // Simulate voice capture
      setTimeout(() => {
        setIsListening(false);
        voiceCommandMutation.mutate({ command: promptInput });
      }, 3500);
    } else {
      setIsListening(false);
    }
  };

  const handleCreateProjectSubmit = () => {
    if (!promptInput.trim()) {
      toast.error("Please provide a prompt describing your desired AI model.");
      return;
    }
    createProjectMutation.mutate({
      prompt: promptInput,
      name: customProjectName || undefined,
      projectType: selectedProjectType,
      modelFamily: selectedModelFamily,
      autoExecute: true,
    });
  };

  const hardware = hardwareQuery.data || statusQuery.data?.hardware;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Top Holographic Stark Bar */}
      <header className="border-b border-cyan-500/20 bg-[#090f1d]/90 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              onClick={() => setLocation("/")}
              className="flex items-center gap-2 cursor-pointer group"
              title="Return to JARVIS Core"
            >
              <div className="size-9 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)] group-hover:border-cyan-300 transition-all">
                <Brain className="size-5 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tracking-widest text-cyan-400 font-bold">JARVIS</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Skill: ai_builder
                  </span>
                </div>
                <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                  Autonomous AI & LLM Builder
                </h1>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden lg:flex items-center gap-1 ml-6 border-l border-slate-800 pl-4 text-xs font-mono">
              {[
                { id: "dashboard", label: "Dashboard", icon: Activity },
                { id: "new_project", label: "New AI Project", icon: Sparkles },
                { id: "projects", label: "Projects", icon: FolderOpen },
                { id: "training", label: "Training Jobs", icon: Flame },
                { id: "builds", label: "Builds", icon: Layers },
                { id: "models_data", label: "Models & Datasets", icon: Database },
                { id: "errors_repair", label: "Self-Repair & Logs", icon: Wrench },
                { id: "settings", label: "Approvals & Safety", icon: ShieldAlert },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)] font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Actions & Emergency Stop */}
          <div className="flex items-center gap-3">
            {/* Quick App Launcher */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => launchAppMutation.mutate({ appName: "vscode" })}
                className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1"
                title="Open Active Workspace in VS Code"
              >
                <Code2 className="size-3 text-cyan-400" />
                <span>VS Code</span>
              </button>
              <button
                onClick={() => launchAppMutation.mutate({ appName: "terminal" })}
                className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1"
                title="Launch Project Terminal"
              >
                <Terminal className="size-3 text-emerald-400" />
                <span>Terminal</span>
              </button>
            </div>

            {/* Emergency STOP Button */}
            <button
              onClick={() =>
                emergencyStopMutation.mutate({
                  action: statusQuery.data?.emergencyStopped ? "RESET" : "STOP",
                  reason: "Operator initiated Emergency Stop via UI",
                })
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all shadow-md ${
                statusQuery.data?.emergencyStopped
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 animate-pulse"
                  : "bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/40 hover:text-red-200"
              }`}
            >
              <Square className="size-3.5 fill-current" />
              <span>{statusQuery.data?.emergencyStopped ? "RESUME SYSTEM" : "STOP JARVIS"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Emergency Stop Alert Banner if active */}
        {statusQuery.data?.emergencyStopped && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/60 flex items-center justify-between text-red-200 backdrop-blur-sm animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert className="size-6 text-red-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">EMERGENCY STOP IS ACTIVE</h4>
                <p className="text-xs text-red-300/90">
                  All active training jobs, terminal execution, and file writing have been safely suspended.
                </p>
              </div>
            </div>
            <button
              onClick={() => emergencyStopMutation.mutate({ action: "RESET" })}
              className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono transition-all"
            >
              Clear Stop & Resume
            </button>
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Top Grid: Active Project HUD + Hardware Telemetry */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Project Card */}
              <div className="lg:col-span-2 rounded-2xl bg-[#0b1329]/80 border border-cyan-500/30 p-6 relative overflow-hidden backdrop-blur-sm shadow-[0_0_25px_rgba(6,182,212,0.1)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                      ACTIVE AI PROJECT
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        activeProject?.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : activeProject?.status === "RUNNING"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      ● {activeProject?.status || "READY"}
                    </span>
                    {activeProject?.verified && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-blue-400" />
                        Verified Ground Truth
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab("new_project")}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  >
                    <Sparkles className="size-3.5" />
                    <span>New AI Project</span>
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                  {activeProject?.name || "Telugu-English Assistant Model"}
                </h2>
                <p className="text-xs text-slate-300 mb-4 max-w-2xl line-clamp-2">
                  {activeProject?.description ||
                    "Fine-tuned multilingual instruction model for seamless Telugu-English conversational translation and reasoning."}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 mb-5">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block">BASE MODEL</span>
                    <span className="text-xs font-semibold text-cyan-300 truncate block">
                      {activeProject?.modelFamily || "Qwen 2.5 (1.5B)"}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block">OPTIMIZATION</span>
                    <span className="text-xs font-semibold text-emerald-300 truncate block">
                      {activeProject?.trainingMethod || "QLoRA (4-bit PEFT)"}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block">DATASET</span>
                    <span className="text-xs font-semibold text-amber-300 truncate block">
                      {activeProject?.datasetName || "12,400 bilingual pairs"}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block">LATEST BUILD</span>
                    <span className="text-xs font-semibold text-indigo-300 truncate block">
                      {statusQuery.data?.latestBuild
                        ? `Build #${statusQuery.data.latestBuild.buildNumber} (${statusQuery.data.latestBuild.status})`
                        : "Build #014 (Passed)"}
                    </span>
                  </div>
                </div>

                {/* Live Training Progress Meter */}
                {activeJob && (
                  <div className="bg-slate-900/80 rounded-xl p-3.5 border border-cyan-500/20">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <Flame className="size-3.5 text-amber-400 animate-pulse" />
                        <span className="font-mono font-bold text-slate-200">
                          Training Progress: Epoch {activeJob.currentEpoch}/{activeJob.totalEpochs} (Step{" "}
                          {activeJob.currentStep}/{activeJob.totalSteps})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-cyan-400">{activeJob.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                        style={{ width: `${activeJob.progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Loss: {activeJob.currentLoss}</span>
                      <span>VRAM: {activeJob.gpuVramGb}GB</span>
                      <span>Throughput: {activeJob.throughput}</span>
                      <span>ETA: {activeJob.estimatedRemainingSeconds}s</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Hardware Telemetry Dial Card */}
              <div className="rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6 backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="size-4 text-cyan-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                        HARDWARE INSPECTION
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {hardware?.feasibilityRating || "OPTIMAL"}
                    </span>
                  </div>

                  {/* GPU info */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">GPU Acceleration</span>
                        <span className="font-mono font-semibold text-cyan-300">{hardware?.gpuName || "CUDA Core"}</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">GPU VRAM</span>
                        <span className="font-mono text-slate-200">
                          {hardware?.freeVramGb || 6.4}GB / {hardware?.gpuVramGb || 8.0}GB
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400"
                          style={{
                            width: `${
                              ((hardware?.gpuVramGb! - hardware?.freeVramGb!) / (hardware?.gpuVramGb || 8)) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">System RAM</span>
                        <span className="font-mono text-slate-200">
                          {hardware?.freeRamGb || 12}GB free / {hardware?.totalRamGb || 16}GB total
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400"
                          style={{
                            width: `${
                              ((hardware?.totalRamGb! - hardware?.freeRamGb!) / (hardware?.totalRamGb || 16)) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">CPU Load</span>
                        <span className="font-mono text-slate-200">
                          {hardware?.cpuLoadPercent || 15}% ({hardware?.cpuCores || 8} cores)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400" style={{ width: `${hardware?.cpuLoadPercent || 15}%` }} />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-cyan-400 font-semibold">Feasibility Note: </span>
                    {hardware?.feasibilityNote ||
                      "System has sufficient RAM and acceleration for LoRA fine-tuning and local LLM pipelines."}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{hardware?.pythonVersion || "Python 3.11"}</span>
                  <span className="text-emerald-400 font-semibold">{hardware?.accelerator || "CUDA 12.4"}</span>
                </div>
              </div>
            </div>

            {/* Middle Grid: Live Training Loss Graph & Recent Builds / Self-Repair */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Training Loss Curve Card */}
              <div className="lg:col-span-2 rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-cyan-400" />
                    <h3 className="text-sm font-mono font-bold uppercase text-slate-200">
                      LIVE TRAINING LOSS & CONVERGENCE HUD
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <span className="size-2 rounded-full bg-cyan-400 inline-block" /> Train Loss
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 ml-2">
                      <span className="size-2 rounded-full bg-emerald-400 inline-block" /> Val Loss
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={
                        activeJob?.history && activeJob.history.length > 0
                          ? activeJob.history
                          : [
                              { step: 20, loss: 2.34, valLoss: 2.41 },
                              { step: 60, loss: 1.82, valLoss: 1.89 },
                              { step: 100, loss: 1.45, valLoss: 1.48 },
                              { step: 160, loss: 1.15, valLoss: 1.19 },
                              { step: 220, loss: 0.94, valLoss: 0.98 },
                              { step: 300, loss: 0.81, valLoss: 0.79 },
                            ]
                      }
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="step" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090f1d",
                          borderColor: "#06b6d4",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "#fff",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="loss"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorLoss)"
                      />
                      <Line
                        type="monotone"
                        dataKey="valLoss"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: "#10b981" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-3 border-t border-slate-800">
                  <span>Learning Rate: {activeJob?.learningRate || 0.0002}</span>
                  <span>Throughput: {activeJob?.throughput || "1,840 tokens/s"}</span>
                  <span>Batch Size: 2 (Accum: 4)</span>
                  <button
                    onClick={() => setActiveTab("training")}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                  >
                    Manage Job <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>

              {/* Recent Activity & Self-Repair Card */}
              <div className="rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6 backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="size-4 text-amber-400" />
                      <h3 className="text-sm font-mono font-bold uppercase text-slate-200">
                        SELF-REPAIR & RECENT LOGS
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab("errors_repair")}
                      className="text-[10px] font-mono text-cyan-400 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  {/* Errors / Self-repair summary */}
                  {errorsQuery.data && errorsQuery.data.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {errorsQuery.data.slice(0, 2).map((err) => (
                        <div
                          key={err.id}
                          className="p-2.5 rounded-lg bg-slate-900/90 border border-amber-500/30 text-xs"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px] text-amber-400 font-bold mb-1">
                            <span>[{err.errorCategory}]</span>
                            <span>{err.status}</span>
                          </div>
                          <p className="text-slate-300 text-[11px] line-clamp-1 mb-1.5">{err.diagnosis}</p>
                          <button
                            onClick={() =>
                              selfRepairMutation.mutate({
                                attemptId: err.id,
                                projectSlug: activeProject?.slug || "ai-project",
                              })
                            }
                            className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold hover:bg-cyan-500/30"
                          >
                            Apply Fix: {err.appliedAction.slice(0, 28)}...
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 mb-4">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                      <span>Zero active errors. Self-repair heuristics standing by.</span>
                    </div>
                  )}

                  {/* Recent Logs Stream */}
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {logsQuery.data?.slice(0, 5).map((log) => (
                      <div key={log.id} className="text-slate-400 truncate flex items-center gap-1.5">
                        <span className="text-[10px] text-cyan-400/70">[{log.source}]</span>
                        <span className="text-slate-300">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 mt-4 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Total Projects: {projectsQuery.data?.length || 1}</span>
                  <span className="text-slate-400">Builds: {buildsQuery.data?.length || 1}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NEW AI PROJECT (NATURAL LANGUAGE STUDIO) */}
        {activeTab === "new_project" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="rounded-2xl bg-[#0b1329]/90 border border-cyan-500/30 p-6 backdrop-blur-md relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block mb-1">
                    JARVIS NATURAL LANGUAGE AI BUILDER
                  </span>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Describe the AI System You Wish to Create
                  </h2>
                </div>
                <button
                  onClick={handleVoiceToggle}
                  className={`p-3 rounded-full border transition-all shadow-lg ${
                    isListening
                      ? "bg-red-500 text-white border-red-400 animate-pulse scale-110 shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                      : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30"
                  }`}
                  title={isListening ? "Listening... (Click to stop)" : "Speak your request to JARVIS"}
                >
                  {isListening ? <Mic className="size-5" /> : <MicOff className="size-5" />}
                </button>
              </div>

              {/* Natural Language Prompt Input */}
              <div className="relative mb-4">
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  rows={4}
                  placeholder="e.g. Create an AI model that understands Telugu and English, use my dataset from the AI folder, fine-tune an appropriate open model, test it, and save everything in my Projects folder."
                  className="w-full rounded-xl bg-slate-950/80 border border-cyan-500/30 p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans shadow-inner transition-all"
                />
                <button
                  onClick={handleCreateProjectSubmit}
                  disabled={createProjectMutation.isPending}
                  className="absolute bottom-3 right-3 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50"
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Planning Architecture...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>Build With JARVIS</span>
                    </>
                  )}
                </button>
              </div>

              {/* One-Click AI Templates / Presets */}
              <div className="mb-6">
                <span className="text-xs font-mono text-slate-400 block mb-2 font-semibold">
                  OR CHOOSE AN AI PRESET TEMPLATE:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: "telugu_eng",
                      title: "Telugu-English Multilingual LLM",
                      desc: "Qwen 2.5 (1.5B) + 4-bit QLoRA bilingual translation & chat",
                      prompt:
                        "Create an AI model that understands Telugu and English, use my dataset from the AI folder, fine-tune an appropriate open model, test it, and save everything in my Projects folder.",
                      type: "LLM_FINE_TUNING",
                      model: "Qwen 2.5 (1.5B)",
                    },
                    {
                      id: "rag_agent",
                      title: "Document RAG Knowledge Base",
                      desc: "Local vector search + Ollama generation for internal docs",
                      prompt:
                        "Build an autonomous enterprise document RAG assistant that indexes all PDF and markdown files in the data directory.",
                      type: "RAG_AGENT",
                      model: "Ollama Local Model",
                    },
                    {
                      id: "custom_nn",
                      title: "Custom PyTorch Neural Net",
                      desc: "Lightweight multi-layer neural network trained from scratch",
                      prompt:
                        "Create a custom PyTorch architecture from scratch for tabular classification with automated hyperparameter tuning.",
                      type: "CUSTOM_NEURAL_NET",
                      model: "Custom PyTorch Architecture",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedPreset(preset.id);
                        setPromptInput(preset.prompt);
                        setSelectedProjectType(preset.type);
                        setSelectedModelFamily(preset.model);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        selectedPreset === preset.id
                          ? "bg-cyan-500/15 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <h4 className="text-xs font-bold text-white mb-0.5">{preset.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hardware-Aware Rationale & Auto Recommendation */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                    <Cpu className="size-4" />
                    HARDWARE FIT ADVISOR
                  </span>
                  <span className="font-mono text-slate-400">
                    VRAM: {hardware?.gpuVramGb || 8}GB | RAM: {hardware?.totalRamGb || 16}GB
                  </span>
                </div>
                <p className="text-slate-300">
                  JARVIS recommends{" "}
                  <span className="text-cyan-300 font-semibold">Qwen 2.5 (1.5B) / Llama 3.2 (3B) with 4-bit QLoRA</span>.
                  This ensures peak throughput with zero CUDA memory bottlenecks on your system.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROJECTS & SOURCE CODE VIEWER */}
        {activeTab === "projects" && (
          <div className="space-y-6">
            {/* Project List Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b1329]/80 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <FolderOpen className="size-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Project Workspace</h3>
                  <p className="text-xs text-slate-400">
                    Select a project to inspect files, execute plan steps, or edit generated code.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={activeProject?.id}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-slate-900 border border-cyan-500/40 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none"
                >
                  {projectsQuery.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => runFullPlanMutation.mutate({ projectId: activeProject?.id! })}
                  disabled={runFullPlanMutation.isPending || !activeProject}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] disabled:opacity-50"
                >
                  <Zap className="size-3.5" />
                  <span>Run Full Autonomous Plan</span>
                </button>
              </div>
            </div>

            {/* Plan Steps Grid */}
            {activeProject && (
              <div className="rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6">
                <h3 className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="size-4 text-cyan-400" />
                  EXECUTION PLAN & VERIFICATION PIPELINE ({activeProject.plan.length} Steps)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeProject.plan.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        step.status === "COMPLETED"
                          ? "bg-emerald-950/15 border-emerald-500/40"
                          : step.status === "RUNNING"
                          ? "bg-cyan-950/20 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                          : "bg-slate-900/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="size-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-mono text-cyan-400">
                            {idx + 1}
                          </span>
                          {step.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            step.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : step.status === "RUNNING"
                              ? "bg-cyan-500/20 text-cyan-300 animate-pulse"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {step.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2 pl-7">{step.description}</p>
                      <div className="flex items-center justify-between pl-7">
                        <span className="text-[10px] font-mono text-slate-500">
                          Action: {step.actionType}
                        </span>
                        {step.status !== "COMPLETED" && (
                          <button
                            onClick={() =>
                              executeStepMutation.mutate({ projectId: activeProject.id, stepId: step.id })
                            }
                            className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold hover:bg-cyan-500/30"
                          >
                            Execute Step
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Code & Files Browser */}
            {activeProject && activeProject.files.length > 0 && (
              <div className="rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileCode className="size-4 text-cyan-400" />
                    <h3 className="text-sm font-mono font-bold uppercase text-slate-200">
                      GENERATED SOURCE CODE & SCRIPTS
                    </h3>
                  </div>
                  <button
                    onClick={() => launchAppMutation.mutate({ appName: "vscode" })}
                    className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Open in IDE <ArrowUpRight className="size-3" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* File List */}
                  <div className="space-y-1">
                    {activeProject.files.map((file, i) => (
                      <button
                        key={file.relativePath}
                        onClick={() => setSelectedFileIndex(i)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-all ${
                          selectedFileIndex === i
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                      >
                        <span className="truncate">{file.relativePath}</span>
                        <span className="text-[10px] text-slate-500">{file.language}</span>
                      </button>
                    ))}
                  </div>

                  {/* Code View */}
                  <div className="lg:col-span-3 rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-slate-200 max-h-96">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
                      <span>{activeProject.files[selectedFileIndex]?.relativePath}</span>
                      <span>{activeProject.files[selectedFileIndex]?.sizeBytes} bytes</span>
                    </div>
                    <pre className="whitespace-pre text-[11px] leading-relaxed text-cyan-100/90 font-mono">
                      {activeProject.files[selectedFileIndex]?.content || "// No content"}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TRAINING JOBS */}
        {activeTab === "training" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#0b1329]/80 border border-cyan-500/30 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                    TRAINING CONTROL ENGINE
                  </span>
                  <h2 className="text-xl font-bold text-white">
                    {activeJob?.projectName || "Telugu-English Assistant Model"}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">{activeJob?.modelName}</p>
                </div>

                {/* Training Controls: Start, Pause, Resume, Stop, Restart */}
                <div className="flex items-center gap-2">
                  {activeJob?.status === "RUNNING" ? (
                    <button
                      onClick={() => pauseTrainingMutation.mutate({ jobId: activeJob.id })}
                      className="px-3.5 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-mono font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Pause className="size-3.5" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        activeJob?.status === "PAUSED"
                          ? resumeTrainingMutation.mutate({ jobId: activeJob.id })
                          : startTrainingMutation.mutate({ jobId: activeJob?.id! })
                      }
                      className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                    >
                      <Play className="size-3.5" />
                      <span>{activeJob?.status === "PAUSED" ? "Resume" : "Start Training"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => stopTrainingMutation.mutate({ jobId: activeJob?.id! })}
                    className="px-3.5 py-2 rounded-lg bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/30 font-mono font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Square className="size-3.5" />
                    <span>Stop</span>
                  </button>

                  <button
                    onClick={() => restartTrainingMutation.mutate({ jobId: activeJob?.id! })}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono text-xs flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Restart</span>
                  </button>
                </div>
              </div>

              {/* Telemetry Dials */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block">CURRENT LOSS</span>
                  <span className="text-lg font-mono font-bold text-cyan-400">{activeJob?.currentLoss || 0.814}</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block">BEST VAL LOSS</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">{activeJob?.bestValLoss || 0.792}</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block">GPU VRAM</span>
                  <span className="text-lg font-mono font-bold text-amber-400">{activeJob?.gpuVramGb || 4.8} GB</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block">THROUGHPUT</span>
                  <span className="text-lg font-mono font-bold text-indigo-400">
                    {activeJob?.throughput || "1,840 tokens/s"}
                  </span>
                </div>
              </div>

              {/* Streaming Logs Terminal */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-200">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="size-3.5 text-cyan-400" />
                    <span>TRAINING PROCESS STDOUT</span>
                  </div>
                  <span>{activeJob?.logs.length || 0} entries</span>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2">
                  {activeJob?.logs.map((log, i) => (
                    <div key={i} className="text-slate-300 leading-relaxed">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BUILDS & HISTORY */}
        {activeTab === "builds" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-cyan-400" />
                  <h3 className="text-sm font-mono font-bold uppercase text-slate-200">
                    VERIFIED BUILD HISTORY & ARTIFACTS
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Total Builds: {buildsQuery.data?.length || 1}
                </span>
              </div>

              <div className="space-y-4">
                {buildsQuery.data?.map((build) => (
                  <div
                    key={build.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/20 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-bold text-cyan-400">
                          BUILD #{String(build.buildNumber).padStart(3, "0")}
                        </span>
                        <span className="text-sm font-bold text-white">{build.projectName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {build.status}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        Duration: {build.durationSeconds}s | {new Date(build.startedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{build.summary}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] font-mono text-slate-400 block mb-1">STEPS COMPLETED:</span>
                        <ul className="space-y-0.5 text-slate-300 text-[11px]">
                          {build.stepsCompleted.map((step, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <Check className="size-3 text-emerald-400 shrink-0" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="text-[11px] font-mono text-slate-400 block mb-1">PACKAGED ARTIFACTS:</span>
                        <div className="space-y-1">
                          {build.artifacts.map((art, idx) => (
                            <div
                              key={idx}
                              className="p-1.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-between"
                            >
                              <span className="truncate">{art.name}</span>
                              <span className="text-slate-500">
                                {Math.round((art.sizeBytes / 1024 / 1024) * 10) / 10} MB
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MODELS & DATASETS */}
        {activeTab === "models_data" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Models Card */}
              <div className="rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="size-4 text-cyan-400" />
                  <h3 className="text-sm font-mono font-bold uppercase text-slate-200">
                    AVAILABLE & COMPATIBLE MODELS
                  </h3>
                </div>

                <div className="space-y-3">
                  {modelsQuery.data?.map((model) => (
                    <div
                      key={model.id}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{model.name}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            model.recommendedForHardware
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {model.recommendedForHardware ? "Optimal Fit" : "High VRAM Required"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Params: {model.parameterCount}</span>
                        <span>VRAM Req: ~{model.vramRequiredGb} GB</span>
                        <span>Format: {model.format}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Datasets Card */}
              <div className="rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="size-4 text-amber-400" />
                  <h3 className="text-sm font-mono font-bold uppercase text-slate-200">
                    DETECTED DATASETS
                  </h3>
                </div>

                <div className="space-y-3">
                  {datasetsQuery.data?.map((ds) => (
                    <div
                      key={ds.id}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{ds.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {ds.format}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Samples: {ds.sampleCount.toLocaleString()}</span>
                        <span>Train/Val: {ds.split.train} / {ds.split.val}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-300 overflow-x-auto">
                        <span className="text-slate-500 block mb-1">SAMPLE PREVIEW:</span>
                        <pre>{JSON.stringify(ds.previewSamples[0] || {}, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ERRORS & SELF-REPAIR */}
        {activeTab === "errors_repair" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wrench className="size-4 text-amber-400" />
                  <h3 className="text-sm font-mono font-bold uppercase text-slate-200">
                    DIAGNOSTIC & AUTONOMOUS SELF-REPAIR ENGINE
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Attempts: {errorsQuery.data?.length || 0}
                </span>
              </div>

              {errorsQuery.data && errorsQuery.data.length > 0 ? (
                <div className="space-y-4">
                  {errorsQuery.data.map((att) => (
                    <div
                      key={att.id}
                      className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 text-sm">
                            [{att.errorCategory}]
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Retry {att.retryNumber}/{att.maxRetries}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(att.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded font-mono text-[11px] text-red-300">
                        {att.errorDetected}
                      </div>

                      <div className="space-y-1 text-slate-300">
                        <p>
                          <span className="text-cyan-400 font-semibold">Diagnosis: </span>
                          {att.diagnosis}
                        </p>
                        <p>
                          <span className="text-emerald-400 font-semibold">Suggested Action: </span>
                          {att.suggestedAction}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500">
                          Applied: {att.appliedAction}
                        </span>
                        <button
                          onClick={() =>
                            selfRepairMutation.mutate({
                              attemptId: att.id,
                              projectSlug: activeProject?.slug || "ai-project",
                            })
                          }
                          className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-all"
                        >
                          Execute Self-Repair
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs font-mono">
                  <CheckCircle2 className="size-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-white font-semibold">All Development Operations Healthy</p>
                  <p>No unhandled exceptions or runtime halts recorded.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: APPROVALS & SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Approval Gate */}
            <div className="rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-cyan-400" />
                  <h3 className="text-sm font-mono font-bold uppercase text-slate-200">
                    ACTION APPROVAL GATE
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Pending: {approvalsQuery.data?.filter((a) => a.status === "PENDING").length || 0}
                </span>
              </div>

              {approvalsQuery.data && approvalsQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {approvalsQuery.data.map((appr) => (
                    <div
                      key={appr.id}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{appr.actionName}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            appr.status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : appr.status === "DENIED"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-amber-500/20 text-amber-300 animate-pulse"
                          }`}
                        >
                          {appr.status}
                        </span>
                      </div>
                      <p className="text-slate-300">{appr.description}</p>
                      <p className="text-slate-400 text-[11px]">
                        <span className="text-amber-400 font-semibold">Impact: </span>
                        {appr.potentialImpact}
                      </p>

                      {appr.status === "PENDING" && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          <button
                            onClick={() =>
                              decideApprovalMutation.mutate({ id: appr.id, decision: "APPROVED" })
                            }
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              decideApprovalMutation.mutate({ id: appr.id, decision: "DENIED" })
                            }
                            className="px-3 py-1 rounded bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/40 font-mono font-bold text-xs"
                          >
                            Deny
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-mono">No pending approval requests.</p>
              )}
            </div>

            {/* Sandbox & Paths Settings */}
            <div className="rounded-2xl bg-[#0b1329]/80 border border-slate-800 p-6 text-xs space-y-4">
              <h3 className="text-sm font-mono font-bold uppercase text-slate-200">
                SANDBOX & WORKSPACE SETTINGS
              </h3>
              <div>
                <label className="text-slate-400 block mb-1 font-mono">BASE WORKSPACE DIRECTORY</label>
                <input
                  type="text"
                  readOnly
                  value=".data/ai_projects/"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-cyan-300 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-mono">AUTONOMOUS ERROR REPAIR POLICY</label>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-between">
                  <span>Auto-install safe missing pip packages and adjust batch size on CUDA OOM</span>
                  <span className="text-emerald-400 font-mono font-bold">ENABLED</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
