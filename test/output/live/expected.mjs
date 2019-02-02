_.x([["value",()=>value],["reset",()=>reset],["add",()=>add]]);var value = reset()

       function reset() {
  return _.u(value = 0)
}

       function add(x) {
  _.u(value += x)
}
