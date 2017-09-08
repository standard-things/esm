import assert from "assert"
import compiler from "../build/compiler.js"

describe("compiler", () => {
  it("should respect options.type", () => {
    const types = [void 0, "module", "unambiguous"]

    types.forEach((type) => {
      const result = compiler.compile('import"a"', { type })
      assert.strictEqual(result.type, "module")
    })

    const tests = [
      { code: "1+2", type: "script" },
      { code: "1+2", hint: "module", type: "module" },
      { code: "'use script';import'a'", hint: "module", type: "script" },
      { code: '"use script";import"a"', hint: "module", type: "script" },
      { code: "'use script';import'a'", type: "script" },
      { code: '"use script";import"a"', type: "script" },
      { code: "'use module';1+2", type: "module" },
      { code: '"use module";1+2', type: "module" }
    ]

    tests.forEach((data) => {
      const results = [
        compiler.compile(data.code, { hint: data.hint, type: "unambiguous" }),
        compiler.compile(data.code, { type: "module" })
      ]

      const types = results.map((result) => result.type)
      assert.deepEqual(types, [data.type, "module"])
    })
  })

  it("should respect options.var", () => {
    const values = [void 0, false, true]

    values.forEach((value) => {
      const result = compiler.compile('import a from "a"', { var: value })
      assert.ok(result.code.startsWith(value ? "var a" : "let a"))
    })
  })

  it("should choose unique export and module identifiers", () =>
    import("./compiler/aliases.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should preserve line numbers", () =>
    import("./compiler/lines.mjs")
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

  it("should compile dynamic import with script source type", () => {
    const result = compiler.compile('import("a")', { type: "script" })
    assert.ok(result.code.includes('i("a")'))
  })

  it("should not error on transforms at the end the source", () => {
    const codes = [
      'import{a}from"a"',
      'import"a"',
      "export{a}",
      "export default a"
    ]

    codes.forEach(compiler.compile)
    assert.ok(true)
  })

  it('should not hoist above "use strict"', () =>
    import("./compiler/strict.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not get confused by shebang", () => {
    const code = [
      "#!/usr/bin/env node -r @std/esm",
      'import a from "a"'
    ].join("\n")

    const result = compiler.compile(code)
    assert.ok(result.code.startsWith("let a"))
  })

  it("should not get confused by string literals", () =>
    import("./compiler/strings.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not get confused by trailing comments", () => {
    const result = compiler.compile('import"a"//trailing comment')
    assert.ok(result.code.endsWith("//trailing comment"))
  })
})
