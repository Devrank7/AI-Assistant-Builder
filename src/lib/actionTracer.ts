export interface ActionTrace {
  tool: string;
  args: Record<string, unknown>;
  result: { success: boolean; data?: unknown; error?: string };
  durationMs: number;
  timestamp: Date;
  confirmationRequired: boolean;
  confirmationStatus?: 'approved' | 'rejected' | 'pending';
}

export class ActionTracer {
  private traces: ActionTrace[] = [];

  startTrace(
    tool: string,
    args: Record<string, unknown>,
    confirmationRequired = false
  ): { finish: (result: Record<string, unknown>) => ActionTrace } {
    const startTime = Date.now();
    const timestamp = new Date();

    return {
      finish: (result: Record<string, unknown>): ActionTrace => {
        const trace: ActionTrace = {
          tool,
          args,
          result: {
            success: (result.success as boolean) ?? false,
            data: result.data as unknown,
            error: result.error as string | undefined,
          },
          durationMs: Date.now() - startTime,
          timestamp,
          confirmationRequired,
        };
        this.traces.push(trace);
        return trace;
      },
    };
  }

  addConfirmationTrace(tool: string, args: Record<string, unknown>, status: 'approved' | 'rejected' | 'pending'): void {
    const existing = this.traces.find((t) => t.tool === tool && t.confirmationRequired && !t.confirmationStatus);
    if (existing) {
      existing.confirmationStatus = status;
    } else {
      this.traces.push({
        tool,
        args,
        result: { success: false },
        durationMs: 0,
        timestamp: new Date(),
        confirmationRequired: true,
        confirmationStatus: status,
      });
    }
  }

  getTraces(): ActionTrace[] {
    return [...this.traces];
  }
}
