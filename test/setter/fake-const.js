"use strict";

require("../../node/runtime.js").enable(module);

module.run(function () {
  // Throw for the runSetters call in the compile-hook, module.run,
  // and for the first time we call runSetters in set below.
  let throwTimes = 3;
  let value = 1;

  function set(to) {
    return module.runSetters(value = to);
  }

  module.export({
    value() {
      if (throwTimes-- > 0) {
        throw new Error("simulated");
      }
      return value;
    },
    set: () => set
  }, true); // Mark as constant.
});
