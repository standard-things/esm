function identity(value) {
  return value
}

const ab = { a: "a", b: "b" }
const abc = { ...identity(ab), c: "c" }

export const { a, ...rest } = abc
export default { ...abc, d: "d" }
