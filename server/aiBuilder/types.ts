export type AiBuilderSystemState = "READY" | "PLANNING" | "EXECUTING" | "TRAINING" | "REPAIRING" | "PAUSED" | "STOPPED";

export type OperationStatus =
  | "PLANNING"
  | "QUEUED"
  | "RUNNING"
  | "WAITING_FOR_APPROVAL"
  | "PAUSED"
  | "FAILED"
  | "COMPLETED"
  | "CANCELLED";

export type ProjectType =
  | "LLM_FINE_TUNING"
  | "RAG_AGENT"
  | "VISION_LANGUAGE_MODEL"
  | "CUSTOM_NEURAL_NET"
  | "SPEECH_VOICE_MODEL"
  | "TEXT_CLASSIFICATION"
  | "AUTONOMOUS_DEV_AGENT"
  | "EMBEDDING_MODEL";

export type ModelFamily =
  | "Qwen 2.5 (0.5B/1.5B/7B)"
  | "Llama 3.2 (1B/3B)"
  | "Mistral 7B v0.3"
  | "Phi-3.5 Mini"
  | "DeepSeek R1 Distill (1.5B/7B)"
  | "Custom PyTorch Architecture"
  | "BERT / RoBERTa Small"
  | "Whisper Small / Base"
  | "Ollama Local Model"
  | "OpenAI / Claude API Endpoint";

export type TrainingMethod =
  | "QLoRA (4-bit PEFT)"
  | "LoRA (8-bit PEFT)"
  | "Full Fine-Tuning"
  | "PyTorch Custom Loop"
  | "Direct Preference Optimization (DPO)"
  | "In-Context RAG Indexing"
  | "Prompt Engineering / Agent Scaffold";

export type HardwareTarget = "LOCAL_GPU" | "LOCAL_CPU" | "APPLE_SILICON" | "CLOUD_GPU_FALLBACK";

export interface HardwareProfile {
  cpuModel: string;
  cpuCores: number;
  cpuLoadPercent: number;
  totalRamGb: number;
  freeRamGb: number;
  gpuName: string;
  gpuVramGb: number;
  freeVramGb: number;
  hasCuda: boolean;
  cudaVersion?: string;
  diskFreeGb: number;
  diskTotalGb: number;
  osName: string;
  pythonVersion: string;
  torchVersion?: string;
  accelerator: "CUDA" | "ROCm" | "DirectML" | "CPU";
  feasibilityRating: "OPTIMAL" | "CONSTRAINED_QLORA_ONLY" | "CPU_ONLY_SLOW" | "INSUFFICIENT_VRAM";
  feasibilityNote: string;
}

export interface AiProjectFile {
  relativePath: string;
  content: string;
  language: "python" | "json" | "yaml" | "markdown" | "shell" | "text";
  description: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  actionType:
    | "HARDWARE_AUDIT"
    | "DATASET_DISCOVERY"
    | "MODEL_SELECTION"
    | "SCAFFOLD_PROJECT"
    | "CREATE_FILES"
    | "CONFIGURE_ENV"
    | "INSTALL_DEPENDENCIES"
    | "RUN_TRAINING"
    | "EVALUATE_MODEL"
    | "SELF_REPAIR"
    | "BUILD_RECORD"
    | "REPORT";
  status: OperationStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  logs: string[];
  requiresApproval?: boolean;
}

export interface AiProject {
  id: string;
  name: string;
  slug: string;
  description: string;
  naturalLanguagePrompt: string;
  projectType: ProjectType;
  modelFamily: string;
  trainingMethod: TrainingMethod;
  hardwareTarget: HardwareTarget;
  workspacePath: string;
  datasetName?: string;
  datasetPath?: string;
  datasetSamples?: number;
  status: OperationStatus;
  currentStepIndex: number;
  plan: PlanStep[];
  files: AiProjectFile[];
  dependencies: string[];
  activeTrainingJobId?: string;
  lastBuildId?: string;
  createdAt: string;
  updatedAt: string;
  summaryReport?: string;
  verified: boolean;
}

export interface TrainingMetricPoint {
  step: number;
  epoch: number;
  loss: number;
  valLoss?: number;
  learningRate: number;
  gpuVramUsedGb: number;
  throughputTokensPerSec: number;
  timestamp: string;
}

export interface TrainingJob {
  id: string;
  projectId: string;
  projectName: string;
  modelName: string;
  datasetName: string;
  status: OperationStatus;
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  progressPercent: number;
  currentLoss: number;
  bestValLoss: number;
  learningRate: number;
  gpuVramGb: number;
  throughput: string;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  history: TrainingMetricPoint[];
  logs: string[];
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
}

export interface BuildRecord {
  id: string;
  buildNumber: number;
  projectId: string;
  projectName: string;
  status: "SUCCESS" | "FAILED" | "CANCELLED" | "IN_PROGRESS";
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  stepsCompleted: string[];
  warningsCount: number;
  errorsCount: number;
  warnings: string[];
  errors: string[];
  artifacts: Array<{ name: string; path: string; sizeBytes: number }>;
  summary: string;
  verified: boolean;
}

export interface DatasetItem {
  id: string;
  name: string;
  format: "JSONL" | "CSV" | "PARQUET" | "HUGGINGFACE" | "RAW_TEXT";
  sampleCount: number;
  sizeBytes: number;
  path: string;
  columnsOrKeys: string[];
  previewSamples: Array<Record<string, any>>;
  split: { train: number; val: number; test?: number };
  detectedAt: string;
}

export interface ModelItem {
  id: string;
  name: string;
  family: string;
  parameterCount: string;
  quantization?: "4-bit (AWQ/GGUF)" | "8-bit (bitsandbytes)" | "FP16" | "BF16" | "FP32";
  vramRequiredGb: number;
  format: "GGUF" | "Safetensors" | "PyTorch" | "Ollama" | "API";
  localPath?: string;
  isAvailableLocally: boolean;
  recommendedForHardware: boolean;
}

export interface SelfRepairAttempt {
  id: string;
  projectId: string;
  errorDetected: string;
  errorCategory:
    | "MODULE_NOT_FOUND"
    | "CUDA_OUT_OF_MEMORY"
    | "DATASET_FORMAT_ERROR"
    | "SYNTAX_ERROR"
    | "PATH_NOT_FOUND"
    | "SHAPE_MISMATCH"
    | "DEPENDENCY_CONFLICT"
    | "PERMISSION_DENIED"
    | "PROCESS_TIMEOUT"
    | "UNKNOWN";
  diagnosis: string;
  suggestedAction: string;
  appliedAction: string;
  retryNumber: number;
  maxRetries: number;
  status: "DETECTED" | "APPLYING_FIX" | "RESOLVED" | "ESCALATED_TO_USER";
  timestamp: string;
}

export interface ActionApproval {
  id: string;
  projectId?: string;
  actionName: string;
  description: string;
  reason: string;
  potentialImpact: string;
  commandOrPath?: string;
  severity: "SAFE" | "MODERATE" | "HIGH_RISK" | "CRITICAL";
  status: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED";
  requestedAt: string;
  decidedAt?: string;
  note?: string;
}

export interface StructuredLog {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "COMMAND" | "APPROVAL" | "SELF_REPAIR" | "BUILD";
  source: "AI_PLANNER" | "COMPUTER_USE" | "TRAINER" | "SELF_REPAIR" | "APPROVAL_GATE" | "TERMINAL";
  message: string;
  projectId?: string;
  details?: Record<string, any>;
}
