export let { x, y } = { x: 1, y: 2 }
export function swap() {
  [x, y] = [y, x]
}
