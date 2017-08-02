import assert from "assert"
import resolveId from "../build/resolve-id.js"
import urlToPath from "../build/url-to-path.js"

describe("id resolution", () => {
  it("should throw an error for non-file protocols", () => {
    assert.throws(() => resolveId("about:blank"), Error)
    assert.throws(() => resolveId("ftp://example.com/"), Error)
    assert.throws(() => resolveId("http://example.com/"), Error)
    assert.throws(() => resolveId("https://example.com/"), Error)
  })

  it("should resolve paths with file protocols", () => {
    const modes = ["posix", "win32"]

    modes.forEach((mode) => {
      let actual
      let expected
      const isWin = mode === "win32"

      actual = urlToPath("file:///", mode)
      expected = isWin ? "" : "/"
      assert.strictEqual(actual, expected)

      expected = isWin ? "" : "/home/user"
      actual = urlToPath("file:///home/user?query#fragment", mode)
      assert.strictEqual(actual, expected)

      expected = isWin ? "" : "/home/user/"
      actual = urlToPath("file:///home/user/?query#fragment", mode)
      assert.strictEqual(actual, expected)

      expected = isWin ? "" : "/home/user/ space"
      actual = urlToPath("file:///home/user/%20space", mode)
      assert.strictEqual(actual, expected)

      expected = isWin ? "" : "/home/us\\er"
      actual = urlToPath("file:///home/us%5Cer", mode)
      assert.strictEqual(actual, expected)

      expected = isWin ? "" : "/dev"
      actual = urlToPath("file://localhost/dev", mode)
      assert.strictEqual(actual, expected)

      expected = isWin ? "C:\\Program Files\\" : "/C:/Program Files/"
      actual = urlToPath("file:///C:/Program%20Files/", mode)
      assert.strictEqual(actual, expected)

      expected = isWin ? "\\\\host\\path\\a\\b\\c" : ""

      actual = urlToPath("file://host/path/a/b/c?query#fragment", mode)

      assert.strictEqual(actual, expected)

      expected = isWin ? "C:\\a\\b\\c" : "/C:/a/b/c"
      actual = urlToPath("file:///C:/a/b/c?query#fragment", mode)

      assert.strictEqual(actual, expected)

      expected = isWin ? "\\\\w\u036A\u034Aei\u036C\u034Brd.com\\host\\a" : ""
      actual = urlToPath("file://xn--weird-prdj8vva.com/host/a", mode)
      assert.strictEqual(actual, expected)

      actual = urlToPath("file:///C:/a%2Fb", mode)
      assert.strictEqual(actual, "")
    })
  })
})
