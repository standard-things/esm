export const a = 1;
export const b = function () {
  return d;
};
export let c; // lazy initialization
export function d() {
  return b;
};

c = "c";
