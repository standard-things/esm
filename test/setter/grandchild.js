export let c = 0;
export function increment() {
  ++c;
  module.runSetters();
};
