let a = "a"

export function append(suffix) {
  return a += suffix
}

export { a as x, a as y }
