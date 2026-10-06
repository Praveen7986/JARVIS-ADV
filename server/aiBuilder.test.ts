import { describe, expect, it, beforeEach } from "vitest";
import { hardwareInspector } from "./aiBuilder/hardwareInspector";
import { aiPlanner } from "./aiBuilder/aiPlanner";
import { projectStore } from "./aiBuilder/projectStore";
import { computerUseBridge } from "./aiBuilder/computerUseBridge";
import { trainingEngine } from "./aiBuilder/trainingEngine";
import { selfRepairEngine } from "./aiBuilder/selfRepairEngine";
import { approvalManager } from "./aiBuilder/approvalManager";

describe("JARVIS AI Builder Skill — Autonomous AI/LLM Development Engine", () => {
  beforeEach(async () => {
    await projectStore.init();
    approvalManager.resetEmergencyStop();
  });

  it("1. Inspects system hardware and computes realistic model feasibility", async () => {
    const profile = await hardwareInspector.getProfile(true);
    expect(profile.cpuCores).toBeGreaterThan(0);
    expect(profile.totalRamGb).toBeGreaterThan(0);
    expect(profile.gpuName).toBeDefined();
    expect(profile.gpuVramGb).toBeGreaterThan(0);
    expect(["OPTIMAL", "CONSTRAINED_QLORA_ONLY", "CPU_ONLY_SLOW", "INSUFFICIENT_VRAM"]).toContain(
      profile.feasibilityRating
    );

    // Feasibility calculation for 7B full fine-tuning on constrained hardware
    const assessment = hardwareInspector.assessFeasibilityForPlan(
      { ...profile, gpuVramGb: 4.0 },
      "Mistral 7B v0.3",
      "Full Fine-Tuning"
    );
    expect(assessment.viable).toBe(false);
    expect(assessment.warning).toContain("requires >=48GB VRAM");
    expect(assessment.recommendation).toContain("QLoRA");
  });

  it("2. Translates natural language requirements into an autonomous execution plan and source files", async () => {
    const prompt =
      "Create an AI model that understands Telugu and English, use my dataset from the AI folder, fine-tune an appropriate open model, test it, and save everything in my Projects folder.";
    const planResult = await aiPlanner.analyzeAndPlan({ naturalLanguagePrompt: prompt });

    expect(planResult.projectType).toBe("LLM_FINE_TUNING");
    expect(planResult.name).toContain("Telugu");
    expect(planResult.modelFamily).toContain("Qwen 2.5");
    expect(planResult.trainingMethod).toContain("QLoRA");
    expect(planResult.plan.length).toBeGreaterThanOrEqual(8);

    // Verify generated source files
    const filePaths = planResult.files.map((f) => f.relativePath);
    expect(filePaths).toContain("src/train.py");
    expect(filePaths).toContain("src/evaluate.py");
    expect(filePaths).toContain("src/inference.py");
    expect(filePaths).toContain("src/dataset.py");
    expect(filePaths).toContain("config/training_config.json");
    expect(filePaths).toContain("requirements.txt");
    expect(filePaths).toContain("README.md");

    const trainPy = planResult.files.find((f) => f.relativePath === "src/train.py");
    expect(trainPy?.content).toContain("BitsAndBytesConfig");
    expect(trainPy?.content).toContain("LoraConfig");
  });

  it("3. Scaffolds real project directories and writes code files via Computer Use bridge", async () => {
    const testSlug = "test-telugu-ai";
    const dir = await computerUseBridge.ensureProjectDirectory(testSlug);
    expect(dir).toBeDefined();

    const file = await computerUseBridge.writeProjectFile(
      testSlug,
      "config/test_config.json",
      JSON.stringify({ test: true, lr: 0.0002 }),
      "Test config"
    );
    expect(file.relativePath).toBe("config/test_config.json");
    expect(file.language).toBe("json");
    expect(file.sizeBytes).toBeGreaterThan(0);

    const content = await computerUseBridge.readProjectFile(testSlug, "config/test_config.json");
    expect(JSON.parse(content).lr).toBe(0.0002);
  });

  it("4. Manages non-blocking background training jobs with live metrics & checkpointing", () => {
    const job = trainingEngine.createJob({
      projectId: "proj_test_01",
      projectName: "Test Model",
      modelName: "Qwen 2.5 1.5B (QLoRA 4-bit)",
      datasetName: "bilingual_train.jsonl",
      totalEpochs: 3,
      totalSteps: 100,
    });
    expect(job.status).toBe("QUEUED");

    const startedJob = trainingEngine.startTraining(job.id);
    expect(startedJob.status).toBe("RUNNING");
    expect(startedJob.logs.length).toBeGreaterThan(0);

    const pausedJob = trainingEngine.pauseTraining(job.id);
    expect(pausedJob.status).toBe("PAUSED");

    const resumedJob = trainingEngine.resumeTraining(job.id);
    expect(resumedJob.status).toBe("RUNNING");

    const stoppedJob = trainingEngine.stopTraining(job.id);
    expect(stoppedJob.status).toBe("CANCELLED");

    const evaluation = trainingEngine.evaluateModel(job.id);
    expect(evaluation.accuracy).toBeDefined();
    expect(evaluation.bleuScore).toBeGreaterThan(0);
    expect(evaluation.testSamples.length).toBeGreaterThan(0);
  });

  it("5. Detects runtime errors, classifies root causes, applies automated self-repair, and enforces retry limit", async () => {
    // 1. Missing module detection
    const missingModuleTrace =
      "Traceback (most recent call last):\n  File 'src/train.py', line 7\nModuleNotFoundError: No module named 'peft'";
    const repair1 = selfRepairEngine.diagnoseError(missingModuleTrace, "proj_test_01");
    expect(repair1.errorCategory).toBe("MODULE_NOT_FOUND");
    expect(repair1.appliedAction).toBe("pip install peft");
    expect(repair1.status).toBe("DETECTED");

    // 2. CUDA OOM detection
    const oomTrace = "torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.40 GiB";
    const repair2 = selfRepairEngine.diagnoseError(oomTrace, "proj_test_01");
    expect(repair2.errorCategory).toBe("CUDA_OUT_OF_MEMORY");
    expect(repair2.appliedAction).toContain("load_in_4bit=True");

    // 3. Retry limit escalation check
    selfRepairEngine.diagnoseError(oomTrace, "proj_test_01");
    selfRepairEngine.diagnoseError(oomTrace, "proj_test_01");
    const escalated = selfRepairEngine.diagnoseError(oomTrace, "proj_test_01");
    expect(escalated.status).toBe("ESCALATED_TO_USER");
  });

  it("6. Creates and stores verified build records without faking completion", () => {
    const build = projectStore.createBuild({
      projectId: "proj_telugu_eng",
      projectName: "Telugu-English Assistant Model",
      status: "SUCCESS",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 420,
      stepsCompleted: ["Environment created", "Dependencies installed", "LoRA trained", "Verified"],
      warningsCount: 0,
      errorsCount: 0,
      warnings: [],
      errors: [],
      artifacts: [{ name: "adapter_model.safetensors", path: "models/adapter_model.safetensors", sizeBytes: 38500000 }],
      summary: "Verified build succeeded.",
      verified: true,
    });

    expect(build.id).toBeDefined();
    expect(build.buildNumber).toBeGreaterThan(0);
    expect(build.verified).toBe(true);

    const allBuilds = projectStore.listBuilds();
    expect(allBuilds.length).toBeGreaterThan(0);
  });

  it("7. Enforces action approval policy and Emergency STOP ('STOP JARVIS')", () => {
    // 1. Safe action auto-approves
    const safeApproval = approvalManager.requestApproval({
      actionName: "Create project directory",
      description: "Creates workspace folder",
      reason: "Initial setup",
      potentialImpact: "None",
      severity: "SAFE",
    });
    expect(safeApproval.status).toBe("APPROVED");

    // 2. High-risk action requires approval
    const riskyApproval = approvalManager.requestApproval({
      actionName: "Delete previous checkpoints",
      description: "Permanently delete model checkpoints",
      reason: "Disk cleanup",
      potentialImpact: "Irreversible model loss",
      severity: "HIGH_RISK",
    });
    expect(riskyApproval.status).toBe("PENDING");

    // 3. Decide approval
    const decided = approvalManager.decide(riskyApproval.id, "APPROVED", "Confirmed by user");
    expect(decided.status).toBe("APPROVED");

    // 4. Emergency STOP kills active operations
    approvalManager.triggerEmergencyStop("Test Stop");
    expect(approvalManager.isEmergencyStopped()).toBe(true);

    expect(() => {
      trainingEngine.startTraining("job_telugu_eng_01");
    }).toThrow(/Emergency Stop is active/);

    approvalManager.resetEmergencyStop();
    expect(approvalManager.isEmergencyStopped()).toBe(false);
  });
});
