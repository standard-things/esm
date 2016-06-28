let localValue = "original";
export { localValue as value };
export function run(code) {
  return eval(code);
};
