export let a = 1, b = 2;
export function update() {
  [a, /*hole*/, b] = Array.prototype.slice.call(arguments);
  return a + b;
}
