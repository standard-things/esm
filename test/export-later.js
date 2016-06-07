import { strictEqual } from "assert";

export default "default-1";
export var val = "value-1";

export function exportAgain() {
  export default "default-2";
  val = +(val.split("-")[1]);
  val = "value-" + ++val;
}

export function exportYetAgain() {
  export default "default-3";
}

export function oneLastExport() {
  strictEqual(
    val = "value-3",
    "value-3"
  );
}
