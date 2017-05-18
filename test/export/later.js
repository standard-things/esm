import { strictEqual } from "assert";

export default "default-1";
export let val = "value-1";

export function exportAgain() {
  // Neither of these re-export styles should work, because the original
  // export default still takes precedence over anything else.
  module.exportDefault(exports.default = "default-2");

  // This style also does not work, because the getter function for the
  // variable val is all that matters.
  exports.val = "ignored";

  val = +(val.split("-")[1]);
  val = "value-" + ++val;
}

export function oneLastExport() {
  strictEqual(
    val = "value-3",
    "value-3"
  );
}
