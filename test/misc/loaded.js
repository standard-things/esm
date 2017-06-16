import assert from "assert"
import path from "path"

export function check() {
  // The "path" module is required in lib/compile-hook.js
  // before the runtime is enabled.
  assert.ok(path)
}

