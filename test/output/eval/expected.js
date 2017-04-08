module.export({value:()=>localValue,run:()=>run});var localValue = "original";

function run(code) {
  return module.runModuleSetters(eval(code));
};
