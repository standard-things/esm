function identity(value) {
  return value
}

const ab = { a: 1, b: 2 }
const abc = { ...identity(ab), c: 3 }

export const { a, ...bc } = abc
export default { ...abc, d: 4 }
