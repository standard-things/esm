import { strictEqual } from "assert";

export default "default-1";
export let val = "value-1";

export function exportAgain() {
  module.export("default", exports.default = "default-2");
  val = +(val.split("-")[1]);
  val = "value-" + ++val;
}

export function exportYetAgain() {
  module.export("default", exports.default = "default-3");
}

export function oneLastExport() {
  strictEqual(
    val = "value-3",
    "value-3"
  );
}
