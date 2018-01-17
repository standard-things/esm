import assert from "assert"
import get from "./get.js"

it("test", async () => {
  assert.deepStrictEqual(await get(), ["a", "b"])
})
