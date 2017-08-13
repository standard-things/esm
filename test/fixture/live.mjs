// eslint-disable-next-line no-var
export var value = reset()

export function add(n) {
  value += n
}

export function reset() {
  return value = 0
}
