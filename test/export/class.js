import assert from "assert"

export class H {
  constructor(a, b) {
    assert.ok(this instanceof H)
    this.sum = a + b
  }
}
