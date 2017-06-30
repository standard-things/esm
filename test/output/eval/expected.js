_.export([["value",()=>localValue],["run",()=>run]]);let localValue = "original"



function run(code) {
  return _.runSetters(eval(code))
}
