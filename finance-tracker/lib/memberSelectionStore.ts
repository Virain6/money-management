// Simple in-memory store to pass selected member ids between screens
type Listener = () => void;

let selectedIds = new Set<string>(["me"]);
const listeners = new Set<Listener>();

export function getSelectedMemberIds() {
  return Array.from(selectedIds);
}
export function setSelectedMemberIds(ids: string[]) {
  selectedIds = new Set(ids);
  listeners.forEach((l) => l());
}
export function clearSelectedMembers() {
  selectedIds = new Set(["me"]);
  listeners.forEach((l) => l());
}
export function subscribeSelection(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
