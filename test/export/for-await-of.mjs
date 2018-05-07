import assert from "assert"
import convert from "../fixture/export/for-await-of.mjs"

export default async () => {
  const iterable = [
    Promise.resolve("a"),
    Promise.resolve("b")
  ]

  assert.deepStrictEqual(await convert(iterable), ["a", "b"])
}
