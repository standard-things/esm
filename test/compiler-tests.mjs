import assert from "assert"
import compiler from "../build/compiler.js"

describe("compiler", () => {
  it("should support `options.type`", () => {
    const types = [void 0, "module", "unambiguous"]

    types.forEach((type) => {
      const result = compiler.compile('import"a"', { type })
      assert.strictEqual(result.esm, true)
    })

    const tests = [
      { code: "1+2", esm: false },
      { code: "1+2", esm: true, hint: "module" },
      { code: "'use script';import'a'", esm: false, hint: "module" },
      { code: '"use script";import"a"', esm: false, hint: "module" },
      { code: "'use script';import'a'", esm: false },
      { code: '"use script";import"a"', esm: false },
      { code: "'use module';1+2", esm: true },
      { code: '"use module";1+2', esm: true }
    ]

    tests.forEach((data) => {
      let result = compiler.compile(data.code, { hint: data.hint, type: "unambiguous" })
      assert.strictEqual(result.esm, data.esm)

      result = compiler.compile(data.code, { type: "module" })
      assert.strictEqual(result.esm, true)
    })
  })

  it("should support `options.var`", () => {
    const values = [void 0, false, true]

    values.forEach((value) => {
      const result = compiler.compile('import a from "a"', { var: value })
      assert.ok(result.code.startsWith(value ? "var a" : "let a"))
    })
  })

  it("should choose unique export and module identifiers", () =>
    import("./compiler/aliases.mjs")
      .then((ns) => ns.default())
  )

  it("should preserve line numbers", () =>
    import("./compiler/lines.mjs")
      .then((ns) => ns.default())
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
    const result = compiler.compile('import("a")', { esm: false })
    assert.ok(result.code.includes('i("a")'))
  })

  it('should not hoist above "use strict"', () =>
    import("./compiler/strict.mjs")
      .then((ns) => ns.default())
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
      .then((ns) => ns.default())
  )

  it("should not get confused by trailing comments", () => {
    const result = compiler.compile('import"a"//trailing comment')
    assert.ok(result.code.endsWith("//trailing comment"))
  })

  it("should not error on shorthand async function properties with reserved names", () => {
    compiler.compile("({async delete(){}})")
    assert.ok(true)
  })

  it("should not error on arrow functions with destructured arguments", () => {
    compiler.compile("({a=1})=>{}")
    assert.ok(true)
  })

  it("should not error on transforms at the end of the source", () => {
    const codes = [
      'import{a}from"a"',
      'import"a"',
      "export{a}",
      "export default a"
    ]

    codes.forEach(compiler.compile)
    assert.ok(true)
  })
})
