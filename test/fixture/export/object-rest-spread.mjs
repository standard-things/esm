function identity(value) {
  return value
}

const ab = { a: "a", b: "b" }
const abc = { ...identity(ab), c: "c" }

export const { a, ...bc } = abc
export const d = ({ a, ...bcd } = {}) => bcd
export default { ...abc, d }
