import assert from "assert"
import compiler from "../build/compiler.js"

describe("compiler", () => {
  it("should not get confused by string literals", () =>
    import("./compiler/strings.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not be enabled for nested node_modules", () =>
    import("disabled")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(/unexpected/i.test(e.message))
      })
  )

  it("should choose unique export and module identifiers", () =>
    import("./compiler/aliases")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should be enabled for packages that depend on @std/esm", () =>
    import("enabled")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should preserve line numbers", () =>
    import("./compiler/lines.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it('should not hoist above "use strict"', () =>
     import("./compiler/strict")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should respect options.type", () => {
    const code = 'import "a"'
    const types = [void 0, "module", "unambiguous"]

    types.forEach((type) => {
      const result = compiler.compile(code, { type })
      assert.ok(result.code.includes("watch"))
    })

    const withScript = compiler.compile(code, {
      type: "script"
    }).code

    assert.strictEqual(withScript, code)
  })

  it("should respect options.var", () => {
    const code = 'import def from "mod"'

    const withVar = compiler.compile(code, {
      var: true
    }).code

    assert.ok(withVar.startsWith("var def"))

    const withoutVar = compiler.compile(code, {
      var: false
    }).code

    assert.ok(withoutVar.startsWith("let def"))

    // No options.var is the same as { var: false }.
    const defaultVar = compiler.compile(code).code

    assert.ok(defaultVar.startsWith("let def"))
  })

  it("should not get confused by shebang", () => {
    const code = [
      "#!/usr/bin/env node -r @std/esm",
      'import a from "a"',
    ].join("\n")

    const result = compiler.compile(code)
    assert.ok(result.code.startsWith("let a"))
  })

  it("should not get confused by trailing comments", () => {
    const result = compiler.compile('import "a" // trailing comment')
    assert.ok(result.code.endsWith("// trailing comment"))
  })

  it("should preserve crlf newlines", () => {
    const code = [
      "import {",
      "  strictEqual,",
      "  // blank line",
      "  deepEqual",
      "}",
      'from "assert"'
    ].join("\r\n")

    const result = compiler.compile(code)
    assert.ok(result.code.endsWith("\r\n".repeat(5)))
  })
})
