// What the page tells the browser's console, as text alone: the browser keeps every value handed to the console,
// its last thousand messages, for as long as the page is open, so an error handed over keeps its stack and whatever
// it points at.

// an error as its name and message, any other value as text
export function said(x) {
  if (typeof x === "string") return x;
  if (x && typeof x === "object" && "message" in x) return (x.name && x.name !== "Error" ? x.name + ": " : "") + x.message;
  try { return typeof x === "object" && x !== null ? JSON.stringify(x) : String(x); } catch { return String(x); }
}
const line = (parts) => parts.map(said).join(" ");

export const warn = (...parts) => console.warn(line(parts));
export const note = (...parts) => console.info(line(parts));
export const fault = (...parts) => console.error(line(parts));
