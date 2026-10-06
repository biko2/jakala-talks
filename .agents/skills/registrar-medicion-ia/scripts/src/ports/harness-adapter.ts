import type { AnalysisReport, AnalyzeRequest, Harness } from "../domain/model.ts";

export interface HarnessAdapter {
  readonly harness: Harness;
  analyze(request: AnalyzeRequest): Promise<AnalysisReport>;
}
