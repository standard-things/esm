export const { a, b: c, c: d = 1234 } = {
  a: "a",
  b: "b"
}

export const [x, y, ...rest] = [1, 2, a, c, d]
