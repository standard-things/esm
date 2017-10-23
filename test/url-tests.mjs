import assert from "assert"
import urlToPath from "../build/url-to-path.js"

const isWin = process.platform === "win32"

describe("URL parsing", () => {
  it("should resolve URLs with file protocols", () => {
    let actual
    let expected

    expected = isWin ? "" : "/"
    actual = urlToPath("file:///")
    assert.strictEqual(actual, expected)

    expected = isWin ? "" : "/home/user"
    actual = urlToPath("file:///home/user?query#fragment")
    assert.strictEqual(actual, expected)

    expected = isWin ? "" : "/home/user/"
    actual = urlToPath("file:///home/user/?query#fragment")
    assert.strictEqual(actual, expected)

    expected = isWin ? "" : "/home/user/ space"
    actual = urlToPath("file:///home/user/%20space")
    assert.strictEqual(actual, expected)

    expected = isWin ? "" : "/home/us\\er"
    actual = urlToPath("file:///home/us%5cer")
    assert.strictEqual(actual, expected)

    actual = urlToPath("file:///home/us%5Cer")
    assert.strictEqual(actual, expected)

    expected = isWin ? "" : "/dev"
    actual = urlToPath("file://localhost/dev")
    assert.strictEqual(actual, expected)

    expected = isWin ? "C:\\Program Files\\" : "/C:/Program Files/"
    actual = urlToPath("file:///C:/Program%20Files/")
    assert.strictEqual(actual, expected)

    expected = isWin ? "\\\\host\\path\\a\\b\\c" : ""
    actual = urlToPath("file://host/path/a/b/c?query#fragment")
    assert.strictEqual(actual, expected)

    expected = isWin ? "C:\\a\\b\\c" : "/C:/a/b/c"
    actual = urlToPath("file:///C:/a/b/c?query#fragment")
    assert.strictEqual(actual, expected)

    expected = isWin ? "\\\\w\u036A\u034Aei\u036C\u034Brd.com\\host\\a" : ""
    actual = urlToPath("file://xn--weird-prdj8vva.com/host/a")
    assert.strictEqual(actual, expected)

    actual = urlToPath("file:///C:/a%2fb")
    assert.strictEqual(actual, "")

    actual = urlToPath("file:///C:/a%2Fb")
    assert.strictEqual(actual, "")
  })

  it("should resolve URLs with protocol relative localhost", () => {
    const expected = isWin ? "" : "/dev"
    const actual = urlToPath("//localhost/dev")
    assert.strictEqual(actual, expected)
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
