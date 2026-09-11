import { generateCell } from "../world/generate.js";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ id: data.id, cell: generateCell(data.x, data.z) });
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error) });
  }
};
