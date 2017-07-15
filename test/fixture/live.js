/* eslint no-var: off */
export var value = reset()

export function add(n) {
  value += n
}

export function reset() {
  return value = 0
}
