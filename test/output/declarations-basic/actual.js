export const a = 1;
export const b = () => d;
export let c; // Lazy initialization.
export function d() {
  return b;
};

c = "c";
