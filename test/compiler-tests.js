import assert from "assert"
import compiler from "../build/compiler.js"

describe("compiler", () => {
  it("should be enabled for packages that depend on @std/esm", () =>
    import("enabled")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not be enabled for nested node_modules", () =>
    import("disabled")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.startsWith("Unexpected"))
      })
  )

  it("should respect options.type", () => {
    const values = [void 0, "module", "unambiguous"]

    values.forEach((value) => {
      const result = compiler.compile('import "a"', { type: value })
      assert.strictEqual(result.type, "module")
    })

    const tests = [
      { code: "1+2", type: "script" },
      { code: "'use module';1+2", type: "module" },
      { code: '"use module";1+2', type: "module" }
    ]

    tests.forEach((data) => {
      const result = compiler.compile(data.code, { type: "unambiguous" })
      assert.strictEqual(result.type, data.type)
    })
  })

  it("should respect options.var", () => {
    const code = 'import def from "mod"'
    const values = [void 0, false]

    values.forEach((value) => {
      const result = compiler.compile(code, { var: value })
      assert.ok(result.code.startsWith("let def"))
    })

    const withVar = compiler.compile(code, {
      var: true
    }).code

    assert.ok(withVar.startsWith("var def"))
  })

  it("should not get confused by shebang", () => {
    const code = [
      "#!/usr/bin/env node -r @std/esm",
      'import a from "a"',
    ].join("\n")

    const result = compiler.compile(code)
    assert.ok(result.code.startsWith("let a"))
  })

  it("should not get confused by string literals", () =>
    import("./compiler/strings.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not get confused by trailing comments", () => {
    const result = compiler.compile('import "a" // trailing comment')
    assert.ok(result.code.endsWith("// trailing comment"))
  })

  it("should choose unique export and module identifiers", () =>
    import("./compiler/aliases")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should preserve line numbers", () =>
    import("./compiler/lines.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

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

  it('should not hoist above "use strict"', () =>
    import("./compiler/strict")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should compile dynamic import with script source type", () => {
    const result = compiler.compile('import("a")', { type: "script" })
    assert.ok(result.code.includes('i("a")'))
  })
})
