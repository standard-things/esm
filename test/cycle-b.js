import assert from "assert";

export const one = 1;

import {
  one as aOne,
  two as aTwo,
} from "./cycle-a";

export const two = 2;

export function check() {
  assert.strictEqual(aOne, 1);
  assert.strictEqual(aTwo, 2);
}
