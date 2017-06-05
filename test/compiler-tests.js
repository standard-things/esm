import assert from "assert"
import { compile } from "../lib/compiler.js"
import { parse } from "../lib/parser"

function isUseStrictExprStmt(stmt) {
  return stmt.type === "ExpressionStatement" &&
    stmt.expression.value === "use strict"
}

describe("compiler", () => {
  it("should not get confused by string literals", () =>
    import("./compiler/strings")
      .then((ns) => ns.check())
  )

  it("should not be enabled for nested node_modules", () =>
    import("disabled")
      .then(() => assert.ok(false))
      .catch((error) => {
        assert.ok(error instanceof SyntaxError)
        assert.ok(/unexpected/i.test(error.message))
      })
  )

  it("should choose a unique module identifier", () =>
    import("./compiler/module-alias")
      .then((ns) => ns.check())
  )

  it("should be enabled for packages that depend on @std/esm", () =>
    import("enabled")
      .then((ns) => ns.check())
  )

  it("should preserve line numbers", () =>
    import("./compiler/lines.js")
      .then((ns) => ns.check())
  )

  it('should not hoist above "use strict"', () =>
     import("./compiler/strict")
      .then((ns) => ns.check())
  )

  it("should respect options.generateLetDeclarations", () => {
    const code = 'import def from "mod"'

    const withLet = compile(code, {
      generateLetDeclarations: true
    }).code

    assert.ok(withLet.startsWith("let def"))

    const withoutLet = compile(code, {
      generateLetDeclarations: false
    }).code

    assert.ok(withoutLet.startsWith("var def"))

    // No options.generateLetDeclarations is the same as
    // { generateLetDeclarations: false }.
    const defaultLet = compile(code).code

    assert.ok(defaultLet.startsWith("var def"))
  })

  it("should respect options.sourceType", () => {
    const code = 'import "a"'
    const sourceTypes = [void 0, "module", "unambiguous"]

    sourceTypes.forEach((sourceType) => {
      const result = compile(code, { sourceType })
      assert.ok(result.code.includes("module.watch"))
    })

    const scriptType = compile(code, {
      sourceType: "script"
    }).code

    assert.strictEqual(scriptType, code)
  })

  it("should not get confused by shebang", () => {
    const code = [
      "#!/usr/bin/env node -r @std/esm",
      'import a from "a"',
    ].join("\n")

    const result = compile(code)
    assert.ok(result.code.startsWith("var a"))
  })

  it("should not get confused by trailing comments", () => {
    const result = compile('import "a" // trailing comment')
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

    const result = compile(code, { repl: true })
    assert.ok(result.code.endsWith("\r\n".repeat(5)))
  })
})
