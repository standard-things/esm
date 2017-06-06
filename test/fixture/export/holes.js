export let [a0, a2] = [0, 2]
export function update(...args) {
  [a0, /*hole*/, a2] = args
  return a0 + a2
}
