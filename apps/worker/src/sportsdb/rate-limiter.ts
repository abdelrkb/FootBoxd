// Budget partagé entre tous les appels (v1 et v2) : le plan Premium TheSportsDB limite à
// 100 req/min tous endpoints confondus (section 2 de architecture.md).
export class RateLimiter {
  private readonly callTimestamps: number[] = [];

  constructor(private readonly maxCallsPerWindow: number, private readonly windowMs = 60_000) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    while (this.callTimestamps.length > 0 && now - this.callTimestamps[0] >= this.windowMs) {
      this.callTimestamps.shift();
    }
    if (this.callTimestamps.length < this.maxCallsPerWindow) {
      this.callTimestamps.push(now);
      return;
    }
    const oldestCall = this.callTimestamps[0];
    const waitMs = this.windowMs - (now - oldestCall) + 50;
    await sleep(waitMs);
    return this.acquire();
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
