import assert from "assert"
import getItems from "./index.js"

describe("suite", () => {
  it("test", async () =>
    assert.deepStrictEqual(await getItems(), ["a", "b"])
  )
})
