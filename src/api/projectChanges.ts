const listeners = new Set<(id: string) => void>();
export const notifyProjectChanged = (id: string) => listeners.forEach(listener => listener(id));
export const onProjectChanged = (listener: (id: string) => void) => {
  listeners.add(listener);
  return () => {listeners.delete(listener);};
};
