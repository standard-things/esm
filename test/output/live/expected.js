module.export({value:()=>value,reset:()=>reset,add:()=>add});var value = reset();

function reset() {
  return module.runModuleSetters(value = 0);
}

function add(x) {
  module.runModuleSetters(value += x);
};
