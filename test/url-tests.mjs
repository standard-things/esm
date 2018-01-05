import assert from "assert"
import getFilePathFromURL from "../build/get-file-path-from-url.js"

const isWin = process.platform === "win32"

describe("URL parsing", () => {
  it("should resolve URLs with file protocols", () => {
    let actual
    let expected

    expected = isWin ? "" : "/"
    actual = getFilePathFromURL("file:///")
    assert.strictEqual(actual, expected)

    expected = isWin ? "" : "/home/user"
    actual = getFilePathFromURL("file:///home/user?query#fragment")
    assert.strictEqual(actual, expected)

    expected = isWin ? "" : "/home/user/"
    actual = getFilePathFromURL("file:///home/user/?query#fragment")
    assert.strictEqual(actual, expected)

    expected = isWin ? "" : "/home/user/ space"
    actual = getFilePathFromURL("file:///home/user/%20space")
    assert.strictEqual(actual, expected)

    expected = isWin ? "" : "/home/us\\er"
    actual = getFilePathFromURL("file:///home/us%5cer")
    assert.strictEqual(actual, expected)

    actual = getFilePathFromURL("file:///home/us%5Cer")
    assert.strictEqual(actual, expected)

    expected = isWin ? "" : "/dev"
    actual = getFilePathFromURL("file://localhost/dev")
    assert.strictEqual(actual, expected)

    expected = isWin ? "C:\\Program Files\\" : "/C:/Program Files/"
    actual = getFilePathFromURL("file:///C:/Program%20Files/")
    assert.strictEqual(actual, expected)

    expected = isWin ? "\\\\host\\path\\a\\b\\c" : ""
    actual = getFilePathFromURL("file://host/path/a/b/c?query#fragment")
    assert.strictEqual(actual, expected)

    expected = isWin ? "C:\\a\\b\\c" : "/C:/a/b/c"
    actual = getFilePathFromURL("file:///C:/a/b/c?query#fragment")
    assert.strictEqual(actual, expected)

    expected = isWin ? "\\\\w\u036A\u034Aei\u036C\u034Brd.com\\host\\a" : ""
    actual = getFilePathFromURL("file://xn--weird-prdj8vva.com/host/a")
    assert.strictEqual(actual, expected)

    actual = getFilePathFromURL("file:///C:/a%2fb")
    assert.strictEqual(actual, "")

    actual = getFilePathFromURL("file:///C:/a%2Fb")
    assert.strictEqual(actual, "")
  })

  it("should resolve URLs with protocol relative localhost", () => {
    const expected = isWin ? "" : "/dev"
    const actual = getFilePathFromURL("//localhost/dev")
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
