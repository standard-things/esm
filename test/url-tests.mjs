import assert from "assert"
import urlToPath from "../build/url-to-path.js"

const modes = [
  "posix",
  "win32"
]

describe("URL parsing", () => {
  it("should resolve URLs with file protocols", () => {
    modes.forEach((mode) => {
      let actual
      let expected
      const isWin = mode === "win32"

      expected = isWin ? "" : "/"
      actual = urlToPath("file:///", mode)
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
      actual = urlToPath("file:///home/us%5cer", mode)
      assert.strictEqual(actual, expected)

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

      actual = urlToPath("file:///C:/a%2fb", mode)
      assert.strictEqual(actual, "")

      actual = urlToPath("file:///C:/a%2Fb", mode)
      assert.strictEqual(actual, "")
    })
  })

  it("should resolve URLs with protocol relative localhost", () => {
    modes.forEach((mode) => {
      const expected = mode === "win32" ? "" : "/dev"
      const actual = urlToPath("//localhost/dev", mode)
      assert.strictEqual(actual, expected)
    })
  })

  it("should not resolve URLs with other protocols", () =>
    Promise.all([
      "about:blank",
      "ftp://example.com/",
      "http://example.com/",
      "https://example.com/"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => assert.strictEqual(e.code, "ERR_INVALID_PROTOCOL"))
    ))
  )
})
