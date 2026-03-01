const KEY = 'pv-agent-running';
const EVENT = 'pv-agent-status';

export function setAgentRunning(running: boolean) {
  if (typeof window === 'undefined') return;
  if (running) {
    localStorage.setItem(KEY, '1');
  } else {
    localStorage.removeItem(KEY);
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { running } }));
}

export function isAgentRunning(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEY) === '1';
}

export function onAgentStatusChange(cb: (running: boolean) => void): () => void {
  const handleCustom = (e: Event) => cb((e as CustomEvent<{ running: boolean }>).detail.running);
  // cross-tab: storage event
  const handleStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb(e.newValue === '1');
  };
  window.addEventListener(EVENT, handleCustom);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(EVENT, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}
