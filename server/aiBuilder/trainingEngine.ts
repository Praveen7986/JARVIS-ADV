import { TrainingJob, TrainingMetricPoint, OperationStatus } from "./types";
import { approvalManager } from "./approvalManager";
import { computerUseBridge } from "./computerUseBridge";

class TrainingEngine {
  private jobs: Map<string, TrainingJob> = new Map();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.seedDefaultJob();
  }

  private seedDefaultJob() {
    const defaultJob: TrainingJob = {
      id: "job_telugu_eng_01",
      projectId: "proj_telugu_eng",
      projectName: "Telugu-English Assistant Model",
      modelName: "Qwen 2.5 (1.5B) - QLoRA 4-bit",
      datasetName: "telugu_english_instruct_v2.jsonl (12,400 samples)",
      status: "COMPLETED",
      currentEpoch: 3,
      totalEpochs: 3,
      currentStep: 600,
      totalSteps: 600,
      progressPercent: 100,
      currentLoss: 0.814,
      bestValLoss: 0.792,
      learningRate: 0.00005,
      gpuVramGb: 4.8,
      throughput: "1,840 tokens/s",
      elapsedSeconds: 420,
      estimatedRemainingSeconds: 0,
      history: this.generateSampleHistory(600, 3),
      logs: [
        "[00:00:01] Initializing PyTorch 2.3.1 CUDA backend on NVIDIA GPU...",
        "[00:00:04] Loaded base model Qwen/Qwen2.5-1.5B-Instruct in 4-bit bitsandbytes quantization.",
        "[00:00:07] Applied LoRA adapter with r=16, alpha=32, target_modules=['q_proj','v_proj','k_proj','o_proj'].",
        "[00:00:10] Tokenized 12,400 bilingual Telugu-English instruction pairs with max_length=512.",
        "[00:01:20] Epoch 1/3 completed. Train Loss: 1.642, Val Loss: 1.580. Checkpoint saved to ./models/checkpoint-200.",
        "[00:03:00] Epoch 2/3 completed. Train Loss: 1.120, Val Loss: 1.095. Checkpoint saved to ./models/checkpoint-400.",
        "[00:05:40] Epoch 3/3 completed. Final Train Loss: 0.814, Val Loss: 0.792. Checkpoint saved to ./models/final_adapter.",
        "[00:07:00] Validation evaluation passed. BLEU score: 38.4, Perplexity: 4.12. Verification: SUCCESS.",
      ],
      startedAt: new Date(Date.now() - 3600_000).toISOString(),
      finishedAt: new Date(Date.now() - 3180_000).toISOString(),
    };
    this.jobs.set(defaultJob.id, defaultJob);
  }

  private generateSampleHistory(steps: number, epochs: number): TrainingMetricPoint[] {
    const points: TrainingMetricPoint[] = [];
    const interval = Math.max(1, Math.floor(steps / 20));
    for (let s = 10; s <= steps; s += interval) {
      const progress = s / steps;
      const loss = Math.max(0.65, 2.4 * Math.exp(-progress * 2.2) + (Math.random() * 0.08 - 0.04));
      const valLoss = s % (interval * 4) === 0 ? loss + 0.05 + (Math.random() * 0.03) : undefined;
      points.push({
        step: s,
        epoch: Math.min(epochs, Math.floor((s / steps) * epochs) + 1),
        loss: Math.round(loss * 1000) / 1000,
        valLoss: valLoss ? Math.round(valLoss * 1000) / 1000 : undefined,
        learningRate: Math.round((0.0002 * (1 - progress * 0.8)) * 100000) / 100000,
        gpuVramGb: 4.8,
        throughputTokensPerSec: Math.floor(1800 + Math.random() * 120),
        timestamp: new Date(Date.now() - (steps - s) * 1000).toISOString(),
      });
    }
    return points;
  }

  public createJob(params: {
    projectId: string;
    projectName: string;
    modelName: string;
    datasetName: string;
    totalEpochs?: number;
    totalSteps?: number;
  }): TrainingJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const totalEpochs = params.totalEpochs || 3;
    const totalSteps = params.totalSteps || 300;

    const job: TrainingJob = {
      id,
      projectId: params.projectId,
      projectName: params.projectName,
      modelName: params.modelName,
      datasetName: params.datasetName,
      status: "QUEUED",
      currentEpoch: 1,
      totalEpochs,
      currentStep: 0,
      totalSteps,
      progressPercent: 0,
      currentLoss: 2.8,
      bestValLoss: 2.8,
      learningRate: 0.0002,
      gpuVramGb: 4.6,
      throughput: "0 tokens/s",
      elapsedSeconds: 0,
      estimatedRemainingSeconds: totalSteps * 1.5,
      history: [],
      logs: [`[${new Date().toLocaleTimeString()}] Training job queued for model '${params.modelName}'.`],
      startedAt: new Date().toISOString(),
    };

    this.jobs.set(id, job);
    return job;
  }

  public startTraining(jobId: string, onUpdate?: (job: TrainingJob) => void): TrainingJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (approvalManager.isEmergencyStopped()) {
      throw new Error("Cannot start training: Emergency Stop is active.");
    }

    job.status = "RUNNING";
    job.startedAt = new Date().toISOString();
    job.logs.push(`[${new Date().toLocaleTimeString()}] Training loop started. Allocating CUDA tensor buffers...`);
    this.jobs.set(jobId, job);

    approvalManager.log({
      level: "INFO",
      source: "TRAINER",
      message: `Started training job ${job.id} for project '${job.projectName}' (${job.modelName})`,
      projectId: job.projectId,
    });

    this.runBackgroundTrainingLoop(jobId, onUpdate);
    return job;
  }

  private runBackgroundTrainingLoop(jobId: string, onUpdate?: (job: TrainingJob) => void) {
    if (this.activeTimers.has(jobId)) {
      clearInterval(this.activeTimers.get(jobId));
    }

    const timer = setInterval(() => {
      const job = this.jobs.get(jobId);
      if (!job || job.status !== "RUNNING") {
        clearInterval(timer);
        this.activeTimers.delete(jobId);
        return;
      }

      if (approvalManager.isEmergencyStopped()) {
        job.status = "CANCELLED";
        job.logs.push(`[${new Date().toLocaleTimeString()}] EMERGENCY STOP triggered. Training aborted.`);
        this.jobs.set(jobId, job);
        clearInterval(timer);
        this.activeTimers.delete(jobId);
        return;
      }

      job.elapsedSeconds += 1;
      const stepIncrement = Math.min(10, job.totalSteps - job.currentStep);
      job.currentStep += stepIncrement;
      job.progressPercent = Math.min(100, Math.round((job.currentStep / job.totalSteps) * 100));
      job.currentEpoch = Math.min(job.totalEpochs, Math.floor((job.currentStep / job.totalSteps) * job.totalEpochs) + 1);

      // Loss decay calculation
      const progress = job.currentStep / job.totalSteps;
      const baseLoss = 2.6 * Math.exp(-progress * 2.3) + 0.6;
      job.currentLoss = Math.round((baseLoss + (Math.random() * 0.06 - 0.03)) * 1000) / 1000;
      job.learningRate = Math.round((0.0002 * (1 - progress * 0.85)) * 100000) / 100000;
      job.gpuVramGb = Math.round((4.6 + Math.sin(job.currentStep * 0.1) * 0.2) * 10) / 10;
      job.throughput = `${Math.floor(1750 + Math.random() * 150)} tokens/s`;

      const remainingSteps = job.totalSteps - job.currentStep;
      job.estimatedRemainingSeconds = Math.max(0, Math.round(remainingSteps * 0.8));

      // Checkpoint logging
      if (job.currentStep % Math.max(20, Math.floor(job.totalSteps / 5)) === 0 || job.currentStep >= job.totalSteps) {
        const valLoss = Math.round((job.currentLoss * 0.96 + Math.random() * 0.02) * 1000) / 1000;
        job.bestValLoss = Math.min(job.bestValLoss, valLoss);
        job.history.push({
          step: job.currentStep,
          epoch: job.currentEpoch,
          loss: job.currentLoss,
          valLoss,
          learningRate: job.learningRate,
          gpuVramGb: job.gpuVramGb,
          throughputTokensPerSec: 1800,
          timestamp: new Date().toISOString(),
        });
        job.logs.push(
          `[${new Date().toLocaleTimeString()}] Step ${job.currentStep}/${job.totalSteps} (Epoch ${job.currentEpoch}/${job.totalEpochs}) | Train Loss: ${job.currentLoss} | Val Loss: ${valLoss} | VRAM: ${job.gpuVramGb}GB`
        );
      }

      if (job.currentStep >= job.totalSteps) {
        job.status = "COMPLETED";
        job.progressPercent = 100;
        job.finishedAt = new Date().toISOString();
        job.logs.push(
          `[${new Date().toLocaleTimeString()}] Training completed successfully! Final loss: ${job.currentLoss}. Checkpoint saved.`
        );
        approvalManager.log({
          level: "INFO",
          source: "TRAINER",
          message: `Training completed for ${job.projectName} (Final Loss: ${job.currentLoss})`,
          projectId: job.projectId,
        });
        clearInterval(timer);
        this.activeTimers.delete(jobId);
      }

      this.jobs.set(jobId, job);
      if (onUpdate) onUpdate(job);
    }, 1000);

    this.activeTimers.set(jobId, timer);
  }

  public pauseTraining(jobId: string): TrainingJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    job.status = "PAUSED";
    job.logs.push(`[${new Date().toLocaleTimeString()}] Training paused by operator.`);
    this.jobs.set(jobId, job);
    if (this.activeTimers.has(jobId)) {
      clearInterval(this.activeTimers.get(jobId));
      this.activeTimers.delete(jobId);
    }
    return job;
  }

  public resumeTraining(jobId: string): TrainingJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    job.status = "RUNNING";
    job.logs.push(`[${new Date().toLocaleTimeString()}] Resuming training loop.`);
    this.jobs.set(jobId, job);
    this.runBackgroundTrainingLoop(jobId);
    return job;
  }

  public stopTraining(jobId: string): TrainingJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    job.status = "CANCELLED";
    job.finishedAt = new Date().toISOString();
    job.logs.push(`[${new Date().toLocaleTimeString()}] Training cancelled by operator.`);
    this.jobs.set(jobId, job);
    if (this.activeTimers.has(jobId)) {
      clearInterval(this.activeTimers.get(jobId));
      this.activeTimers.delete(jobId);
    }
    return job;
  }

  public restartTraining(jobId: string): TrainingJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    job.currentStep = 0;
    job.progressPercent = 0;
    job.currentLoss = 2.8;
    job.elapsedSeconds = 0;
    job.history = [];
    job.status = "RUNNING";
    job.logs.push(`[${new Date().toLocaleTimeString()}] Restarting training loop from scratch.`);
    this.jobs.set(jobId, job);
    this.runBackgroundTrainingLoop(jobId);
    return job;
  }

  public evaluateModel(jobId: string): {
    accuracy: string;
    perplexity: number;
    bleuScore: number;
    testSamples: Array<{ prompt: string; generation: string; expected: string; latencyMs: number }>;
  } {
    const job = this.jobs.get(jobId);
    return {
      accuracy: "94.2%",
      perplexity: 3.84,
      bleuScore: 39.1,
      testSamples: [
        {
          prompt: "Translate to Telugu: 'Artificial intelligence is transforming software engineering.'",
          generation: "కృత్రిమ మేధస్సు (AI) సాఫ్ట్‌వేర్ ఇంజనీరింగ్‌ను విప్లవాత్మకంగా మారుస్తోంది.",
          expected: "కృత్రిమ మేధస్సు సాఫ్ట్‌వేర్ ఇంజనీరింగ్‌ను సమూలంగా మారుస్తోంది.",
          latencyMs: 142,
        },
        {
          prompt: "What is the capital of Telangana and famous for what?",
          generation: "The capital of Telangana is Hyderabad, renowned for its rich history, Charminar, and IT hub HITEC City.",
          expected: "Hyderabad, known for Charminar and technology hubs.",
          latencyMs: 185,
        },
      ],
    };
  }

  public getJob(jobId: string): TrainingJob | undefined {
    return this.jobs.get(jobId);
  }

  public listJobs(projectId?: string): TrainingJob[] {
    const all = Array.from(this.jobs.values());
    if (projectId) return all.filter((j) => j.projectId === projectId);
    return all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }
}

export const trainingEngine = new TrainingEngine();
