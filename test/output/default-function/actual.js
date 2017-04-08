import { strictEqual } from "assert";

var obj = {};

export default function f() {
  return obj;
}

export function check(g) {
  strictEqual(f, g);
  strictEqual(f(), obj);
  strictEqual(g(), obj);
}
