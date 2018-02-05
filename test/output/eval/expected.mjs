_.e([["value",()=>localValue],["indirect",()=>indirect],["direct",()=>direct]]);let localValue = "original"



function indirect(code) {
  return (0, eval)(code)
}

function direct(code) {
  return _.u(eval(_.l(code)))
}
