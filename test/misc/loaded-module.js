import assert from "assert"
import { Module as M } from "module"

export function check() {
  // The "module" module is required in ../lib/node.js before we begin
  // compiling anything.
  assert.ok(module instanceof M)
}

