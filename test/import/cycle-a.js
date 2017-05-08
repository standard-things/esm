import assert from "assert";

export const one = 1;

import {
  one as bOne,
  two as bTwo,
} from "./cycle-b";

export const two = 2;

export function check() {
  assert.strictEqual(bOne, 1);
  assert.strictEqual(bTwo, 2);
}
