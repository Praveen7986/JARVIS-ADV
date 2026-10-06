import fs from "node:fs/promises";
import path from "node:path";
import {
  AiProject,
  BuildRecord,
  DatasetItem,
  ModelItem,
  OperationStatus,
  PlanStep,
} from "./types";
import { computerUseBridge } from "./computerUseBridge";
import { approvalManager } from "./approvalManager";

class ProjectStore {
  private projects: Map<string, AiProject> = new Map();
  private builds: Map<string, BuildRecord> = new Map();
  private datasets: Map<string, DatasetItem> = new Map();
  private models: Map<string, ModelItem> = new Map();
  private activeProjectId: string | null = null;
  private isInitialized = false;

  constructor() {
    this.seedDefaultData();
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    await computerUseBridge.initWorkspace();
    this.isInitialized = true;
  }

  private seedDefaultData() {
    // 1. Seed Telugu-English Assistant Model Project
    const teluguProject: AiProject = {
      id: "proj_telugu_eng",
      name: "Telugu-English Assistant Model",
      slug: "telugu-english-assistant",
      description: "Fine-tuned multilingual instruction model for seamless Telugu-English conversational translation and reasoning.",
      naturalLanguagePrompt: "Create an AI model that understands Telugu and English, use my dataset from the AI folder, fine-tune an appropriate open model, test it, and save everything in my Projects folder.",
      projectType: "LLM_FINE_TUNING",
      modelFamily: "Qwen 2.5 (1.5B)",
      trainingMethod: "QLoRA (4-bit PEFT)",
      hardwareTarget: "LOCAL_GPU",
      workspacePath: ".data/ai_projects/telugu-english-assistant",
      datasetName: "telugu_english_instruct_v2.jsonl",
      datasetPath: "./data/telugu_english_instruct_v2.jsonl",
      datasetSamples: 12400,
      status: "COMPLETED",
      currentStepIndex: 10,
      plan: [
        {
          id: "p_step_1",
          title: "Hardware Feasibility Inspection",
          description: "Audited GPU VRAM (8GB) and allocated 4-bit NormalFloat QLoRA profile.",
          actionType: "HARDWARE_AUDIT",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 3600_000).toISOString(),
          completedAt: new Date(Date.now() - 3590_000).toISOString(),
          logs: ["GPU VRAM: 8.0 GB available", "Allocated 4.8 GB tensor memory footprint", "Feasibility: OPTIMAL"],
        },
        {
          id: "p_step_2",
          title: "Dataset Discovery & Tokenizer Prep",
          description: "Ingested 12,400 bilingual instruction pairs with 90/10 train/val split.",
          actionType: "DATASET_DISCOVERY",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 3590_000).toISOString(),
          completedAt: new Date(Date.now() - 3550_000).toISOString(),
          logs: ["Loaded 12,400 samples from telugu_english_instruct_v2.jsonl", "Train split: 11,160 | Val split: 1,240"],
        },
        {
          id: "p_step_3",
          title: "Model Selection (Qwen 2.5 1.5B)",
          description: "Configured base weights and bitsandbytes 4-bit quantization config.",
          actionType: "MODEL_SELECTION",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 3550_000).toISOString(),
          completedAt: new Date(Date.now() - 3520_000).toISOString(),
          logs: ["Selected Qwen/Qwen2.5-1.5B-Instruct", "Target modules: q_proj, v_proj, k_proj, o_proj"],
        },
        {
          id: "p_step_4",
          title: "Scaffold Project Structure",
          description: "Created directory hierarchy (src/, data/, models/, config/, logs/).",
          actionType: "SCAFFOLD_PROJECT",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 3520_000).toISOString(),
          completedAt: new Date(Date.now() - 3500_000).toISOString(),
          logs: ["Created .data/ai_projects/telugu-english-assistant/ directory tree"],
        },
        {
          id: "p_step_5",
          title: "Generate Source Code",
          description: "Generated train.py, evaluate.py, inference.py, and dataset.py.",
          actionType: "CREATE_FILES",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 3500_000).toISOString(),
          completedAt: new Date(Date.now() - 3450_000).toISOString(),
          logs: ["Wrote train.py (145 lines)", "Wrote evaluate.py", "Wrote inference.py", "Wrote dataset.py"],
        },
        {
          id: "p_step_6",
          title: "Environment & Dependencies Verification",
          description: "Verified PyTorch 2.3.1, Transformers 4.41, PEFT, and bitsandbytes.",
          actionType: "INSTALL_DEPENDENCIES",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 3450_000).toISOString(),
          completedAt: new Date(Date.now() - 3400_000).toISOString(),
          logs: ["Dependencies verified. CUDA accelerator active."],
        },
        {
          id: "p_step_7",
          title: "Fine-Tuning Execution",
          description: "Executed 3 epochs over 600 optimization steps. Loss dropped to 0.814.",
          actionType: "RUN_TRAINING",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 3400_000).toISOString(),
          completedAt: new Date(Date.now() - 3000_000).toISOString(),
          logs: ["Epoch 1: Loss 1.642", "Epoch 2: Loss 1.120", "Epoch 3: Loss 0.814", "LoRA weights saved."],
        },
        {
          id: "p_step_8",
          title: "Evaluation & Benchmarking",
          description: "Achieved 38.4 BLEU and 4.12 Perplexity on bilingual test set.",
          actionType: "EVALUATE_MODEL",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 3000_000).toISOString(),
          completedAt: new Date(Date.now() - 2950_000).toISOString(),
          logs: ["Validation passed: Accuracy 94.2%", "Zero translation hallucination detected."],
        },
        {
          id: "p_step_9",
          title: "Build Packaging & Verification",
          description: "Packaged LoRA adapter weights and verified deployment readiness.",
          actionType: "BUILD_RECORD",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 2950_000).toISOString(),
          completedAt: new Date(Date.now() - 2900_000).toISOString(),
          logs: ["Build #014 generated and verified."],
        },
        {
          id: "p_step_10",
          title: "Executive Completion Report",
          description: "Prepared final delivery briefing for user review.",
          actionType: "REPORT",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 2900_000).toISOString(),
          completedAt: new Date(Date.now() - 2850_000).toISOString(),
          logs: ["Report delivered."],
        },
      ],
      files: [
        {
          relativePath: "src/train.py",
          content: "# PyTorch / LoRA Training script",
          language: "python",
          description: "LoRA fine-tuning loop",
          sizeBytes: 4210,
          updatedAt: new Date().toISOString(),
        },
        {
          relativePath: "src/evaluate.py",
          content: "# Evaluation script",
          language: "python",
          description: "Evaluation benchmark",
          sizeBytes: 2150,
          updatedAt: new Date().toISOString(),
        },
        {
          relativePath: "config/training_config.json",
          content: "{}",
          language: "json",
          description: "Hyperparameters",
          sizeBytes: 412,
          updatedAt: new Date().toISOString(),
        },
      ],
      dependencies: ["torch>=2.3.0", "transformers>=4.41.0", "peft>=0.11.0", "bitsandbytes>=0.43.0"],
      activeTrainingJobId: "job_telugu_eng_01",
      lastBuildId: "build_014",
      createdAt: new Date(Date.now() - 86400_000).toISOString(),
      updatedAt: new Date().toISOString(),
      summaryReport: "Model successfully fine-tuned on 12,400 Telugu-English instruction pairs with 4-bit QLoRA. Final validation loss: 0.792. Evaluation score: 38.4 BLEU.",
      verified: true,
    };

    this.projects.set(teluguProject.id, teluguProject);
    this.activeProjectId = teluguProject.id;

    // 2. Seed Builds
    const build014: BuildRecord = {
      id: "build_014",
      buildNumber: 14,
      projectId: "proj_telugu_eng",
      projectName: "Telugu-English Assistant Model",
      status: "SUCCESS",
      startedAt: new Date(Date.now() - 3600_000).toISOString(),
      completedAt: new Date(Date.now() - 2850_000).toISOString(),
      durationSeconds: 750,
      stepsCompleted: [
        "Environment created",
        "Dependencies installed",
        "Dataset processed (12,400 samples)",
        "Model configured (Qwen 2.5 1.5B 4-bit)",
        "Training completed (3 epochs, loss 0.814)",
        "Evaluation verified (BLEU 38.4)",
      ],
      warningsCount: 1,
      errorsCount: 0,
      warnings: ["Minor validation loss oscillation at step 420; auto-adjusted learning rate decay."],
      errors: [],
      artifacts: [
        { name: "adapter_model.safetensors", path: "models/final_adapter/adapter_model.safetensors", sizeBytes: 38_500_000 },
        { name: "adapter_config.json", path: "models/final_adapter/adapter_config.json", sizeBytes: 1_240 },
        { name: "training_metrics.json", path: "logs/training_metrics.json", sizeBytes: 45_000 },
      ],
      summary: "Verified Build #014 succeeded. LoRA adapter saved with 38.5MB footprint.",
      verified: true,
    };
    this.builds.set(build014.id, build014);

    // 3. Seed Datasets
    const datasetsList: DatasetItem[] = [
      {
        id: "ds_telugu_en",
        name: "telugu_english_instruct_v2.jsonl",
        format: "JSONL",
        sampleCount: 12400,
        sizeBytes: 18_400_000,
        path: ".data/ai_projects/data/telugu_english_instruct_v2.jsonl",
        columnsOrKeys: ["instruction", "input", "output"],
        previewSamples: [
          {
            instruction: "Translate this sentence into Telugu.",
            input: "Artificial intelligence empowers modern robotics.",
            output: "కృత్రిమ మేధస్సు ఆధునిక రోబోటిక్స్‌ను శక్తివంతం చేస్తుంది.",
          },
          {
            instruction: "Explain gravity in Telugu.",
            input: "",
            output: "గురుత్వాకర్షణ అనేది ద్రవ్యరాశి కలిగిన వస్తువులు ఒకదానికొకటి ఆకర్షించుకునే ప్రాథమిక శక్తి.",
          },
        ],
        split: { train: 11160, val: 1240 },
        detectedAt: new Date(Date.now() - 86400_000).toISOString(),
      },
      {
        id: "ds_tech_docs",
        name: "engineering_knowledge_base.parquet",
        format: "PARQUET",
        sampleCount: 8500,
        sizeBytes: 42_000_000,
        path: ".data/ai_projects/data/engineering_knowledge_base.parquet",
        columnsOrKeys: ["document_id", "section", "content", "tags"],
        previewSamples: [
          { document_id: "DOC_001", section: "Architecture", content: "Microservices with distributed event bus...", tags: "backend" },
        ],
        split: { train: 7650, val: 850 },
        detectedAt: new Date(Date.now() - 172800_000).toISOString(),
      },
    ];
    datasetsList.forEach((d) => this.datasets.set(d.id, d));

    // 4. Seed Models
    const modelsList: ModelItem[] = [
      {
        id: "mod_qwen_1_5b",
        name: "Qwen 2.5 (1.5B Instruct)",
        family: "Qwen 2.5",
        parameterCount: "1.5 Billion",
        quantization: "4-bit (AWQ/GGUF)",
        vramRequiredGb: 3.5,
        format: "Safetensors",
        isAvailableLocally: true,
        recommendedForHardware: true,
      },
      {
        id: "mod_llama_3_2",
        name: "Llama 3.2 (3B Instruct)",
        family: "Llama 3.2",
        parameterCount: "3.2 Billion",
        quantization: "4-bit (AWQ/GGUF)",
        vramRequiredGb: 4.8,
        format: "Safetensors",
        isAvailableLocally: true,
        recommendedForHardware: true,
      },
      {
        id: "mod_mistral_7b",
        name: "Mistral 7B Instruct v0.3",
        family: "Mistral 7B",
        parameterCount: "7.3 Billion",
        quantization: "4-bit (AWQ/GGUF)",
        vramRequiredGb: 5.8,
        format: "Safetensors",
        isAvailableLocally: false,
        recommendedForHardware: true,
      },
      {
        id: "mod_phi_3_5",
        name: "Phi-3.5 Mini (3.8B)",
        family: "Phi-3.5",
        parameterCount: "3.8 Billion",
        quantization: "4-bit (AWQ/GGUF)",
        vramRequiredGb: 4.5,
        format: "GGUF",
        isAvailableLocally: true,
        recommendedForHardware: true,
      },
      {
        id: "mod_deepseek_r1_7b",
        name: "DeepSeek R1 Distill Qwen (7B)",
        family: "DeepSeek R1",
        parameterCount: "7.0 Billion",
        quantization: "4-bit (AWQ/GGUF)",
        vramRequiredGb: 6.2,
        format: "GGUF",
        isAvailableLocally: false,
        recommendedForHardware: false,
      },
    ];
    modelsList.forEach((m) => this.models.set(m.id, m));
  }

  public getActiveProject(): AiProject | undefined {
    if (!this.activeProjectId) return undefined;
    return this.projects.get(this.activeProjectId);
  }

  public setActiveProject(id: string): void {
    if (this.projects.has(id)) {
      this.activeProjectId = id;
    }
  }

  public getProject(id: string): AiProject | undefined {
    return this.projects.get(id);
  }

  public listProjects(): AiProject[] {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public saveProject(project: AiProject): AiProject {
    project.updatedAt = new Date().toISOString();
    this.projects.set(project.id, project);
    this.activeProjectId = project.id;
    return project;
  }

  public deleteProject(id: string): boolean {
    if (this.projects.has(id)) {
      this.projects.delete(id);
      if (this.activeProjectId === id) {
        const remaining = Array.from(this.projects.keys());
        this.activeProjectId = remaining[0] || null;
      }
      return true;
    }
    return false;
  }

  public createBuild(record: Omit<BuildRecord, "id" | "buildNumber">): BuildRecord {
    const buildCount = this.builds.size + 1;
    const id = `build_${String(buildCount).padStart(3, "0")}`;
    const build: BuildRecord = {
      ...record,
      id,
      buildNumber: buildCount,
    };
    this.builds.set(id, build);

    const project = this.projects.get(record.projectId);
    if (project) {
      project.lastBuildId = id;
      this.projects.set(project.id, project);
    }

    approvalManager.log({
      level: "BUILD",
      source: "AI_PLANNER",
      message: `Build #${build.buildNumber} [${build.status}] recorded for project '${build.projectName}'`,
      projectId: build.projectId,
      details: { buildId: id, warnings: build.warningsCount, errors: build.errorsCount },
    });

    return build;
  }

  public listBuilds(projectId?: string): BuildRecord[] {
    const all = Array.from(this.builds.values());
    if (projectId) return all.filter((b) => b.projectId === projectId);
    return all.sort((a, b) => b.buildNumber - a.buildNumber);
  }

  public listDatasets(): DatasetItem[] {
    return Array.from(this.datasets.values());
  }

  public listModels(): ModelItem[] {
    return Array.from(this.models.values());
  }
}

export const projectStore = new ProjectStore();
