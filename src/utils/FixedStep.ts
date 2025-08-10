export class FixedStep {
  private acc = 0;
  constructor(public readonly dt = 1 / 120, public readonly clamp = 0.05) {}
  tick(now: number, last: number): { frame: number; steps: number } {
    const frame = Math.min(this.clamp, now - last);
    this.acc += frame;
    let steps = 0;
    while (this.acc >= this.dt) { this.acc -= this.dt; steps++; }
    return { frame, steps };
  }
}
