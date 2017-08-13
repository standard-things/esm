export const { a, b: c, c: d = "d" } = {
  a: "a",
  b: "b"
}

export const [e, f, ...rest] = ["e", "f", a, c, d]
