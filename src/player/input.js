export class Input {
  keys = new Set();
  actions = new Set();
  yaw = 0;
  enabled = false;
  constructor(canvas) {
    this.canvas = canvas;
    this.down = (e) => {
      if (
        ["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
          e.code,
        ) &&
        this.enabled
      )
        e.preventDefault();
      if (!e.repeat) {
        this.keys.add(e.code);
        if (this.enabled && ["Space", "KeyE"].includes(e.code))
          this.actions.add(e.code);
      }
    };
    this.up = (e) => this.keys.delete(e.code);
    this.blur = () => {
      this.keys.clear();
      this.actions.clear();
    };
    this.mouse = (e) => {
      if (document.pointerLockElement === canvas)
        this.yaw -= e.movementX * 0.003;
    };
    addEventListener("keydown", this.down);
    addEventListener("keyup", this.up);
    addEventListener("blur", this.blur);
    document.addEventListener("mousemove", this.mouse);
  }
  consume(key) {
    const has = this.actions.has(key);
    this.actions.delete(key);
    return has;
  }
  sample(dt) {
    if (!this.enabled) return { x: 0, z: 0, jump: false, sprint: false };
    this.yaw +=
      ((this.keys.has("ArrowLeft") ? 1 : 0) -
        (this.keys.has("ArrowRight") ? 1 : 0)) *
      dt *
      1.8;
    let x = Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA")),
      z = Number(this.keys.has("KeyS")) - Number(this.keys.has("KeyW"));
    const n = Math.hypot(x, z) || 1;
    x /= n;
    z /= n;
    return {
      x: x * Math.cos(this.yaw) + z * Math.sin(this.yaw),
      z: z * Math.cos(this.yaw) - x * Math.sin(this.yaw),
      jump: this.consume("Space"),
      sprint: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"),
    };
  }
  dispose() {
    removeEventListener("keydown", this.down);
    removeEventListener("keyup", this.up);
    removeEventListener("blur", this.blur);
    document.removeEventListener("mousemove", this.mouse);
  }
}
