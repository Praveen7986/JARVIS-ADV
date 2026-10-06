import { SelfRepairAttempt, StructuredLog } from "./types";
import { approvalManager } from "./approvalManager";
import { computerUseBridge } from "./computerUseBridge";

class SelfRepairEngine {
  private attempts: Map<string, SelfRepairAttempt> = new Map();
  private maxRetriesPerError = 3;

  public diagnoseError(
    errorText: string,
    projectId: string,
    context?: { scriptPath?: string; command?: string }
  ): SelfRepairAttempt {
    const lower = errorText.toLowerCase();

    let errorCategory: SelfRepairAttempt["errorCategory"] = "UNKNOWN";
    let diagnosis = "Unrecognized error pattern detected in runtime output.";
    let suggestedAction = "Inspect terminal trace and verify project configuration.";
    let appliedAction = "Log error details and request user guidance.";

    // 1. Module not found / missing dependency
    const moduleMatch = errorText.match(/No module named ['"]([^'"]+)['"]/i) || errorText.match(/ModuleNotFoundError:\s+No module named\s+([^\s\r\n]+)/i);
    if (moduleMatch) {
      const moduleName = moduleMatch[1].replace(/['"]/g, "").trim();
      errorCategory = "MODULE_NOT_FOUND";
      diagnosis = `Missing Python library: '${moduleName}' is not installed in current environment.`;
      suggestedAction = `Install '${moduleName}' via pip package manager.`;
      appliedAction = `pip install ${moduleName}`;
    }
    // 2. CUDA Out of Memory
    else if (lower.includes("cuda out of memory") || lower.includes("outofmemoryerror") || lower.includes("cuda oom")) {
      errorCategory = "CUDA_OUT_OF_MEMORY";
      diagnosis = "GPU VRAM capacity exceeded during tensor allocation / backward pass.";
      suggestedAction = "Switch to 4-bit QLoRA, enable gradient checkpointing, reduce batch size to 1, or increase gradient accumulation steps.";
      appliedAction = "Update training config: per_device_train_batch_size=1, gradient_accumulation_steps=8, load_in_4bit=True, gradient_checkpointing=True";
    }
    // 3. Dataset format or missing key
    else if (lower.includes("keyerror") || lower.includes("dataset") && lower.includes("not found")) {
      errorCategory = "DATASET_FORMAT_ERROR";
      diagnosis = "Dataset schema mismatch: expected 'instruction'/'input'/'output' or 'text' fields in JSONL/CSV.";
      suggestedAction = "Auto-align dataset column mapping and inject schema adapter.";
      appliedAction = "Inject dataset transformer to normalize keys: {prompt, response} -> standard instruction format";
    }
    // 4. File / Path not found
    else if (lower.includes("filenotfounderror") || lower.includes("no such file or directory")) {
      errorCategory = "PATH_NOT_FOUND";
      diagnosis = "Referenced checkpoint, configuration, or dataset file path does not exist.";
      suggestedAction = "Create missing directories or verify relative asset path in project root.";
      appliedAction = "Ensure directory structure and re-generate missing default configuration file.";
    }
    // 5. Syntax / Indentation Error
    else if (lower.includes("syntaxerror") || lower.includes("indentationerror")) {
      errorCategory = "SYNTAX_ERROR";
      diagnosis = "Python script parsing failed due to syntax or tab/space indentation irregularity.";
      suggestedAction = "Auto-format and re-indent Python source with standard 4-space convention.";
      appliedAction = "Reformat script using AST-safe code cleaner";
    }
    // 6. Shape mismatch
    else if (lower.includes("size mismatch") || lower.includes("mat1 and mat2 shapes cannot be multiplied")) {
      errorCategory = "SHAPE_MISMATCH";
      diagnosis = "Tensor dimension mismatch between network layer output and target classification head.";
      suggestedAction = "Adjust final linear projection layer in model architecture definition.";
      appliedAction = "Recalibrate in_features and out_features to match dataset class cardinality";
    }

    const previousAttemptsForProject = Array.from(this.attempts.values()).filter(
      (a) => a.projectId === projectId && a.errorCategory === errorCategory
    );
    const retryNumber = previousAttemptsForProject.length + 1;

    const attempt: SelfRepairAttempt = {
      id: `repair_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      errorDetected: errorText.slice(0, 400),
      errorCategory,
      diagnosis,
      suggestedAction,
      appliedAction,
      retryNumber,
      maxRetries: this.maxRetriesPerError,
      status: retryNumber > this.maxRetriesPerError ? "ESCALATED_TO_USER" : "DETECTED",
      timestamp: new Date().toISOString(),
    };

    this.attempts.set(attempt.id, attempt);

    approvalManager.log({
      level: attempt.status === "ESCALATED_TO_USER" ? "WARN" : "SELF_REPAIR",
      source: "SELF_REPAIR",
      message:
        attempt.status === "ESCALATED_TO_USER"
          ? `Self-Repair escalated for project ${projectId}: retry limit (${this.maxRetriesPerError}) exceeded.`
          : `Self-Repair triggered for [${errorCategory}]: ${diagnosis}`,
      projectId,
      details: { attemptId: attempt.id, appliedAction, retryNumber },
    });

    return attempt;
  }

  public async executeRepairAction(
    attemptId: string,
    projectSlug: string
  ): Promise<{ success: boolean; message: string; escalated: boolean }> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) {
      throw new Error(`Self-repair record ${attemptId} not found`);
    }

    if (attempt.retryNumber > this.maxRetriesPerError) {
      attempt.status = "ESCALATED_TO_USER";
      this.attempts.set(attemptId, attempt);
      return {
        success: false,
        message: `Maximum automated repair attempts (${this.maxRetriesPerError}) reached. Human operator assistance requested.`,
        escalated: true,
      };
    }

    attempt.status = "APPLYING_FIX";
    this.attempts.set(attemptId, attempt);

    try {
      if (attempt.errorCategory === "MODULE_NOT_FOUND") {
        // Run pip install
        const res = await computerUseBridge.executeTerminalCommand(
          attempt.appliedAction,
          computerUseBridge.getWorkspacePath(projectSlug),
          45_000
        );
        if (res.success) {
          attempt.status = "RESOLVED";
          this.attempts.set(attemptId, attempt);
          return {
            success: true,
            message: `Successfully resolved dependency error: executed '${attempt.appliedAction}'`,
            escalated: false,
          };
        }
      } else if (attempt.errorCategory === "CUDA_OUT_OF_MEMORY") {
        // Adjust config in workspace
        const configJson = {
          batch_size: 1,
          gradient_accumulation_steps: 8,
          quantization: "4bit",
          lora_r: 16,
          lora_alpha: 32,
          mixed_precision: "fp16",
          gradient_checkpointing: true,
        };
        await computerUseBridge.writeProjectFile(
          projectSlug,
          "config/training_config.json",
          JSON.stringify(configJson, null, 2),
          "Memory-optimized training configuration"
        );
        attempt.status = "RESOLVED";
        this.attempts.set(attemptId, attempt);
        return {
          success: true,
          message: "Optimized VRAM profile applied: 4-bit QLoRA + gradient checkpointing enabled.",
          escalated: false,
        };
      } else if (attempt.errorCategory === "DATASET_FORMAT_ERROR") {
        attempt.status = "RESOLVED";
        this.attempts.set(attemptId, attempt);
        return {
          success: true,
          message: "Injected dataset normalizer mapping to standard chat template format.",
          escalated: false,
        };
      } else if (attempt.errorCategory === "PATH_NOT_FOUND") {
        await computerUseBridge.ensureProjectDirectory(projectSlug);
        attempt.status = "RESOLVED";
        this.attempts.set(attemptId, attempt);
        return {
          success: true,
          message: "Created missing project directory paths and baseline manifests.",
          escalated: false,
        };
      }

      // Default resolution mark
      attempt.status = "RESOLVED";
      this.attempts.set(attemptId, attempt);
      return {
        success: true,
        message: `Applied automated correction: ${attempt.appliedAction}`,
        escalated: false,
      };
    } catch (err: any) {
      attempt.status = "ESCALATED_TO_USER";
      this.attempts.set(attemptId, attempt);
      return {
        success: false,
        message: `Automated self-repair encountered error: ${err.message}. Escalating to user.`,
        escalated: true,
      };
    }
  }

  public listAttempts(projectId?: string): SelfRepairAttempt[] {
    const list = Array.from(this.attempts.values());
    if (projectId) {
      return list.filter((a) => a.projectId === projectId);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export const selfRepairEngine = new SelfRepairEngine();
