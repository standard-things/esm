export function check() {
  "use strict";

  import { strictEqual } from "assert";
  import { a, b, c } from "../abc";

  strictEqual(a, "a");
  strictEqual(b, "b");
  strictEqual(c, "c");

  // Returns true iff the current function is strict.
  return function () {
    return ! this;
  }();
};
