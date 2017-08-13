export const a = "a"
export const b = () => d
export let c // Lazy initialization.
export function d() {
  return b
}

c = "c"
