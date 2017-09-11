import assert from "assert"

export const one = 1

import {
  one as bOne,
  two as bTwo
} from "./b.mjs"

export const two = 2

export default function () {
  assert.strictEqual(bOne, 1)
  assert.strictEqual(bTwo, 2)
}
