import Compiler from "../build/compiler.js"

import assert from "assert"

const SCRIPT = 1
const MODULE = 2
const UNAMBIGUOUS = 3

describe("compiler", () => {
  it("should support `options.cjs.topLevelReturn`", () => {
    assert.doesNotThrow(() => Compiler.compile("return"))

    assert.throws(() => Compiler.compile("return", {
      sourceType: MODULE
    }), SyntaxError)

    assert.doesNotThrow(() => Compiler.compile("return", {
      cjs: {
        topLevelReturn: true
      },
      sourceType: MODULE
    }))
  })

  it("should support `options.sourceType`", () => {
    [MODULE, UNAMBIGUOUS]
      .forEach((sourceType) => {
        const result = Compiler.compile('import"a"', { sourceType })
        assert.strictEqual(result.sourceType, MODULE)
      })
  })

  it("should support `options.cjs.vars`", () => {
    let result = Compiler.compile("arguments")

    assert.strictEqual(result.warnings, null)

    result = Compiler.compile("arguments", {
      cjs: {
        vars: true
      },
      sourceType: MODULE
    })

    assert.strictEqual(result.warnings, null)

    result = Compiler.compile("arguments", {
      sourceType: MODULE
    })

    const warnings = result.warnings || []
    assert.strictEqual(warnings.length, 1)
  })

  it("should support `options.sourceType` of MODULE", () => {
    [
      "1+2",
      "1+2//import",
      "1+2//import.meta",
      '"use module";1+2',
      "'use module';1+2",
      '"use script";1+2',
      "'use script';1+2",
      "import'a'",
      'import"a"',
      "import.meta"
    ]
    .forEach((code) => {
      const result = Compiler.compile(code, {
        sourceType: MODULE
      })

      assert.strictEqual(result.sourceType, MODULE)
    })
  })

  it("should support `options.sourceType` of UNAMBIGUOUS", () => {
    [
      { code: "1+2", sourceType: SCRIPT },
      { code: "1+2//import", sourceType: SCRIPT },
      { code: "1+2//import.meta", sourceType: SCRIPT },
      { code: "return 1+2//eval", sourceType: SCRIPT },
      { code: "1+2", hint: MODULE, sourceType: MODULE },
      { code: '"use module";1+2', sourceType: MODULE },
      { code: "'use module';1+2", hint: MODULE, sourceType: MODULE },
      { code: '"use script";1+2', sourceType: SCRIPT },
      { code: "'use script';1+2", hint: MODULE, sourceType: SCRIPT },
      { code: "import'a'", sourceType: MODULE },
      { code: 'import"a"', hint: MODULE, sourceType: MODULE },
      { code: "import.meta", sourceType: MODULE },
      { code: "import.meta", hint: MODULE, sourceType: MODULE }
    ]
    .forEach((data) => {
      const result = Compiler.compile(data.code, {
        hint: data.hint,
        sourceType: UNAMBIGUOUS
      })

      assert.strictEqual(result.sourceType, data.sourceType)
    })
  })

  it("should support `options.var`", () => {
    [void 0, false, true]
      .forEach((value) => {
        const result = Compiler.compile('import a from "a"', {
          var: value,
          sourceType: MODULE
        })

        assert.ok(result.code.startsWith(value ? "var a" : "let a"))
      })
  })

  it('should support the "use module" directive', () => {
    [
      { code: "'use module';\"use script\";import'a'", hint: MODULE },
      { code: "'use module';\"use script\";import.meta", hint: MODULE },
      { code: '"use module";\'use script\';import"a"', hint: MODULE },
      { code: '"use module";\'use script\';import.meta', hint: MODULE },
      { code: "'use module';\"use script\";import'a'" },
      { code: "'use module';\"use script\";import.meta" },
      { code: '"use module";\'use script\';import"a"' },
      { code: '"use module";\'use script\';import.meta' }
    ]
    .forEach((data) => {
      const result = Compiler.compile(data.code, {
        hint: data.hint,
        sourceType: UNAMBIGUOUS
      })

      assert.strictEqual(result.sourceType, MODULE)
    })
  })

  it('should support the "use script" directive', () => {
    [
      { code: "'use script';\"use module\";import'a'", hint: MODULE },
      { code: "'use script';\"use module\";import.meta", hint: MODULE },
      { code: '"use script";\'use module\';import"a"', hint: MODULE },
      { code: '"use script";\'use module\';import.meta', hint: MODULE },
      { code: "'use script';\"use module\";import'a'" },
      { code: "'use script';\"use module\";import.meta" },
      { code: '"use script";\'use module\';import"a"' },
      { code: '"use script";\'use module\';import.meta' }
    ]
    .forEach((data) => {
      assert.throws(
        () => Compiler.compile(data.code, {
          hint: data.hint,
          sourceType: UNAMBIGUOUS
        }),
        SyntaxError
      )
    })
  })

  it("should support shebangs", () => {
    const code = [
      "#!/usr/bin/env node -r esm",
      'import a from "a"'
    ].join("\n")

    const result = Compiler.compile(code, {
      sourceType: MODULE
    })

    assert.ok(result.code.startsWith("let a"))
  })

  it("should support trailing comments", () => {
    const result = Compiler.compile('import"a"//trailing comment', {
      sourceType: MODULE
    })

    assert.ok(result.code.endsWith("//trailing comment"))
  })

  it("should compile dynamic import with script source sourceType", () => {
    const result = Compiler.compile('import("a")', {
      sourceType: SCRIPT
    })

    assert.ok(result.code.includes('i("a")'))
  })

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

    const result = Compiler.compile(code, {
      sourceType: MODULE
    })

    assert.ok(result.code.endsWith("\r\n".repeat(5)))
  })

  it('should not hoist above "use strict"', () =>
    import("./compiler/strict.mjs")
      .then((ns) => ns.default())
  )

  it("should not get confused by string literals", () =>
    import("./compiler/strings.mjs")
      .then((ns) => ns.default())
  )

  it("should not error on shorthand async function properties with reserved names", () => {
    Compiler.compile("({async delete(){}})")
  })

  it("should not error on arrow functions with destructured arguments", () => {
    [
      "({a=1})=>{}",
      "({a=1},{b=2})=>{}"
    ]
    .forEach(Compiler.compile)
  })

  it("should not error on transforms at the end of the source", () => {
    [
      'import{a}from"a"',
      'import"a"',
      "let a;export{a}",
      "export default a"
    ]
    .forEach((code) => {
      Compiler.compile(code, {
        sourceType: MODULE
      })
    })
  })
})
