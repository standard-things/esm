let localValue = "original"

export { localValue as value }

export function indirect(code) {
  return (0, eval)(code)
}

export function direct(code) {
  return eval(code)
}
