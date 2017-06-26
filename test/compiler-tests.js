import assert from "assert"
import compiler from "../dist/compiler.js"

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

  it("should respect options.generateLetDeclarations", () => {
    const code = 'import def from "mod"'

    const withLet = compiler.compile(code, {
      generateLetDeclarations: true
    }).code

    assert.ok(withLet.startsWith("let def"))

    const withoutLet = compiler.compile(code, {
      generateLetDeclarations: false
    }).code

    assert.ok(withoutLet.startsWith("var def"))

    // No options.generateLetDeclarations is the same as
    // { generateLetDeclarations: true }.
    const defaultLet = compiler.compile(code).code

    assert.ok(defaultLet.startsWith("let def"))
  })

  it("should respect options.sourceType", () => {
    const code = 'import "a"'
    const sourceTypes = [void 0, "module", "unambiguous"]

    sourceTypes.forEach((sourceType) => {
      const result = compiler.compile(code, { sourceType })
      assert.ok(result.code.includes("watch"))
    })

    const scriptType = compiler.compile(code, {
      sourceType: "script"
    }).code

    assert.strictEqual(scriptType, code)
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

    const result = compiler.compile(code, { repl: true })
    assert.ok(result.code.endsWith("\r\n".repeat(5)))
  })
})
