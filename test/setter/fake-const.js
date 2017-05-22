module.run(function () {
  "use strict";

  // Throw once for the mod.runSetters call in module.run, and again for the
  // first time we call module.runSetters in set below.
  let throwTimes = 2;
  let value = 1;

  function set(to) {
    return module.runSetters(value = to);
  }

  module.export({
    value: () => {
      if (throwTimes-- > 0) {
        throw new Error("simulated");
      }
      return value;
    },
    set: () => set
  }, true); // Mark as constant.
});
