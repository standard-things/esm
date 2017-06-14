import assert from "assert"

const args = arguments

export function check() {
  // Ideally, there should not be a top-level `arguments` binding.
  // However, since there is we can at least ensure it's empty.
  assert.strictEqual(args.length, 0)
}
