import assert from "assert"
import path from "path"
import { bridge } from "../fixture/cycle/bridge-owner.js"

export function check() {
  const id = path.join(__dirname, "../fixture/cycle/bridge-owner.js")
  assert.strictEqual(bridge.id, id)
}
