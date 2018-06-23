import Compiler from "../build/compiler.js"

import assert from "assert"

const SCRIPT = 1
const MODULE = 2
const UNAMBIGUOUS = 3

const modernTypes = [MODULE, UNAMBIGUOUS]
const sourceTypes = [SCRIPT, MODULE, UNAMBIGUOUS]

describe("compiler", () => {
  it("should support `options.cjs.topLevelReturn`", () => {
    assert.doesNotThrow(() => Compiler.compile("return"))

    assert.throws(
      () => Compiler.compile("return", { sourceType: MODULE }),
      /SyntaxError: Illegal return statement/
    )

    assert.doesNotThrow(() => Compiler.compile("return", {
      cjs: {
        topLevelReturn: true
      },
      sourceType: MODULE
    }))
  })

  it("should support `options.sourceType`", () => {
    modernTypes.forEach((sourceType) => {
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
      sourceType: MODULE,
      warnings: true
    })

    assert.strictEqual(result.warnings, null)

    result = Compiler.compile("arguments", {
      sourceType: MODULE,
      warnings: true
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
      const result = Compiler.compile(code, { sourceType: MODULE })

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
      { code: "'use script';1+2", hint: MODULE, sourceType: MODULE },
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
        modernTypes.forEach((sourceType) => {
          const result = Compiler.compile('import a from "a"', {
            var: value,
            sourceType
          })

          assert.ok(result.code.startsWith(value ? "var a" : "let a"))
        })
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
      { code: "'use script';\"use module\";import'a'", hint: SCRIPT },
      { code: "'use script';\"use module\";import.meta", hint: SCRIPT },
      { code: '"use script";\'use module\';import"a"', hint: SCRIPT },
      { code: '"use script";\'use module\';import.meta', hint: SCRIPT },
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

    modernTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })

      assert.ok(result.code.startsWith("let a"))
    })
  })

  it("should support trailing comments", () => {
    modernTypes.forEach((sourceType) => {
      const result = Compiler.compile('import"a"//trailing comment', { sourceType })

      assert.ok(result.code.endsWith("//trailing comment"))
    })
  })

  it("should compile dynamic import with script source sourceType", () => {
    const result = Compiler.compile('import("a")', {
      sourceType: SCRIPT
    })

    assert.ok(result.code.includes('i("a")'))
  })

  it("should transform dynamic import in switch statements", () => {
    const code = [
      "(async () => {",
      '  switch (await import("a")) {',
      '    case await import("b"):',
      '      return await import ("c")',
      "  }",
      "})()"
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })

      assert.strictEqual(result.code.includes("import"), false)
    })
  })

  it("should preserve line numbers", () => {
    const code = [
      "import",
      "",
      "a",
      "",
      'from "a"',
      "",
      "export",
      "",
      "default",
      "",
      "() =>",
      "//",
      "{",
      "b",
      "}"
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })
      const lines = result.code.split("\n")

      assert.strictEqual(lines[13], "b")
    })
  })

  it("should preserve crlf newlines", () => {
    const code = [
      "import {",
      "  strictEqual,",
      "",
      "  deepEqual",
      "}",
      'from "assert"'
    ].join("\r\n")

    modernTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })

      assert.ok(result.code.endsWith("\r\n".repeat(5)))
    })
  })

  it("should not get confused by string literals", () => {
    const code = [
      "'a; import b from " + '"c"; d' + "'",
      '"a; import b " + ' + "'from " + '"c"; d' + "'"
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })

      assert.strictEqual(result.code, code)
    })
  })

  it("should parse shorthand async function properties with reserved names", () => {
    sourceTypes.forEach((sourceType) => {
      Compiler.compile("({ async delete() {} })", { sourceType })
    })
  })

  it("should parse arrow functions with destructured arguments", () => {
    [
      "({ a = 1 }) => {}",
      "({ a = 1 }, { b = 2 }) => {}"
    ]
    .forEach((code) => {
      sourceTypes.forEach((sourceType) => {
        Compiler.compile(code, { sourceType })
      })
    })
  })

  it("should parse transforms at the end of the source", () => {
    [
      'import { a } from "a"',
      'import "a"',
      "let a; export { a }",
      "export default a"
    ]
    .forEach((code) => {
      modernTypes.forEach((sourceType) => {
        Compiler.compile(code, { sourceType })
      })
    })
  })

  it("should parse async generator syntax", () => {
    const code = [
      "export default async function * a() {}",
      "export const b = {",
      "  async *b() {}",
      "}",
      "export class C {",
      "  async *c() {}",
      "}"
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      Compiler.compile(code, { sourceType })
    })
  })

  it("should parse BigInt syntax", () => {
    const code = [
      "1n",
      "1234567890123456789n",
      "0b01n",
      "0B01n",
      "0xan",
      "0xAn",
      "0xfn",
      "0xFn",
      "0o01n",
      "0O01n"
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      Compiler.compile(code, { sourceType })
    })
  })

  it("should parse numeric separator syntax", () => {
    const code = [
      "1_0",
      ".1_0e1_0",
      ".1_0E1_0",
      "0b0_1",
      "0B0_1",
      "0x0_a",
      "0x0_A",
      "0x0_f",
      "0x0_F",
      "0o0_1",
      "0O0_1"
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      Compiler.compile(code, { sourceType })
    })
  })

  it("should parse BigInt and numeric separator syntax", () => {
    const code = [
      "1_0n",
      "0b0_1n",
      "0B0_1n",
      "0x0_an",
      "0x0_An",
      "0x0_fn",
      "0x0_Fn",
      "0o0_1n",
      "0O0_1n"
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      Compiler.compile(code, { sourceType })
    })
  })

  it("should parse class fields syntax", () => {
    const code = [
      "export class A { a }",
      'export class B { b = "b" }',
      "export class C { #c }",
      "export class D { async }",
      "export class E { get }",
      "export class F { set }",
      "export class G { static }",
      "export class H {",
      '  #h= "h"',
      "  h() {",
      "    return this.#h",
      "  }",
      "}",
      "export class I {",
      "  async = 1;",
      "  get = 1",
      "  set = 1",
      "  static = 1",
      "}"
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      Compiler.compile(code, { sourceType })
    })
  })

  it("should parse for-await-of syntax", () => {
    const code = [
      "export default async function convert(iterable) {",
      "  const result = []",
      "  for await (const value of iterable) {",
      "    result.push(value)",
      "  }",
      "  return result",
      "}"
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      Compiler.compile(code, { sourceType })
    })
  })

  it("should parse object rest/spread syntax", () => {
    const code = [
      'const ab = { a: "a", b: "b" }',
      'const abc = { ...K(ab), c: "c" }',
      "export const { a, ...bc } = abc",
      "export const d = ({ a, ...bcd } = {}) => bcd",
      "export default { ...abc, d }"
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      Compiler.compile(code, { sourceType })
    })
  })

  it("should support V8 parse errors", () => {
    const options = { sourceType: MODULE }

    assert.throws(
      () => Compiler.compile("a(", options),
      /SyntaxError: Unexpected end of input/
    )

    assert.throws(
      () => Compiler.compile("a(b c)", options),
      /SyntaxError: missing \) after argument list/
    )

    assert.throws(
      () => Compiler.compile("'", options),
      /SyntaxError: Invalid or unexpected token/
    )

    assert.throws(
      () => Compiler.compile("`a", options),
      /SyntaxError: Unterminated template literal/
    )
  })
})
