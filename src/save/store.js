export function validateSave(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.position) ||
    value.position.length !== 3 ||
    !value.position.every(Number.isFinite) ||
    value.position.some((v) => Math.abs(v) > 2100)
  )
    throw Error("Invalid or incompatible save");
  const props = value.props ?? {};
  if (
    typeof props !== "object" ||
    Array.isArray(props) ||
    props === null ||
    Object.keys(props).length > 2048
  )
    throw Error("Invalid prop state");
  for (const p of Object.values(props))
    if (
      !p ||
      !Array.isArray(p.p) ||
      p.p.length !== 3 ||
      !p.p.every(Number.isFinite) ||
      !Array.isArray(p.q) ||
      p.q.length !== 4 ||
      !p.q.every(Number.isFinite)
    )
      throw Error("Invalid prop transform");
  return { version: 1, position: value.position, props };
}
export class SaveStore {
  constructor() {
    this.props = {};
    this.warning = "";
  }
  remember(id, body) {
    const p = body.translation(),
      q = body.rotation();
    this.props[id] = { p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w] };
    const keys = Object.keys(this.props);
    if (keys.length > 2048) delete this.props[keys[0]];
  }
  save(position) {
    try {
      localStorage.setItem(
        "gta-india-v1",
        JSON.stringify({
          version: 1,
          position: [position.x, position.y, position.z],
          props: this.props,
        }),
      );
      return "Saved locally";
    } catch {
      return "Save unavailable: browser storage denied or full";
    }
  }
  load() {
    const raw = localStorage.getItem("gta-india-v1");
    if (!raw) throw Error("No saved game");
    const data = validateSave(JSON.parse(raw));
    this.props = data.props;
    return data.position;
  }
}
