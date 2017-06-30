_.export([["value",()=>value],["reset",()=>reset],["add",()=>add]]);var value = reset()

function reset() {
  return _.runSetters(value = 0)
}

function add(x) {
  _.runSetters(value += x)
}
