import { strictEqual } from "assert";

const obj = {};

export default function f() {
  return obj;
}

export function check(g) {
  strictEqual(f, g);
  strictEqual(f(), obj);
  strictEqual(g(), obj);
}
