export let value = 0

function add(x, y) {
  const value = x
  return value += y
}

const divide = (value, y) => {
  return value /= y
}

const modulo = (value, y) => {
  return value %= y
}

function subtract(value, y) {
  return value -= y
}

function inc() {
  return value += 1
}
