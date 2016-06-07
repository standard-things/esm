import { strictEqual } from "assert";

export default "default-1";
export var val = "value-1";

export function exportAgain() {
  export default "default-2";

  strictEqual(
    module.export("val", val = "value-2"),
    "value-2"
  );
}

export function exportYetAgain() {
  export default "default-3";
}

export function oneLastExport() {
  val = "value-3";
  module.export();
}
