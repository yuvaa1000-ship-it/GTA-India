export class FixedClock {
  accumulator = 0;
  elapsed = 0;
  dropped = 0;
  advance(dt, step) {
    this.accumulator += Math.min(Math.max(dt, 0), 0.1);
    let count = 0;
    while (this.accumulator >= 1 / 60 && count < 5) {
      step(1 / 60);
      this.elapsed += 1 / 60;
      this.accumulator -= 1 / 60;
      count++;
    }
    if (this.accumulator >= 1 / 60) {
      this.dropped += this.accumulator;
      this.accumulator = 0;
    }
    return count;
  }
}
