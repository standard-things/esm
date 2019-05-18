import Compiler from "../build/compiler.js"

import assert from "assert"

const SCRIPT = 1
const MODULE = 2
const UNAMBIGUOUS = 3

const modernTypes = [MODULE, UNAMBIGUOUS]
const sourceTypes = [SCRIPT, MODULE, UNAMBIGUOUS]

describe("compiler tests", () => {
  it("should support `options.topLevelReturn`", () => {
    assert.doesNotThrow(() => Compiler.compile("return"))

    assert.doesNotThrow(() => Compiler.compile("return", {
      sourceType: MODULE,
      topLevelReturn: true
    }))

    assert.throws(
      () => Compiler.compile("return", {
        sourceType: MODULE
      }),
      /SyntaxError: Illegal return statement/
    )
  })

  it("should support `options.sourceType`", () => {
    for (const sourceType of modernTypes) {
      const result = Compiler.compile('import"a"', { sourceType })

      assert.strictEqual(result.sourceType, MODULE)
    }
  })

  it("should support `options.cjsVars`", () => {
    const code = "arguments"

    let result = Compiler.compile(code)

    assert.strictEqual(result.code, code)

    result = Compiler.compile(code, {
      cjsVars: true,
      sourceType: MODULE
    })

    assert.strictEqual(result.code, code)

    result = Compiler.compile(code, { sourceType: MODULE })

    assert.ok(result.code.includes('_.t("arguments")'))
  })

  it("should support `options.sourceType` of MODULE", () => {
    const datas = [
      { code: "1+2", sourceType: MODULE },
      { code: "1+2//import", sourceType: MODULE },
      { code: "1+2//import.meta", sourceType: MODULE },
      { code: '"use module";1+2', sourceType: MODULE },
      { code: "'use module';1+2", sourceType: MODULE },
      { code: '"use script";1+2', sourceType: SCRIPT },
      { code: "'use script';1+2", hint: MODULE, sourceType: MODULE },
      { code: "import'a'", sourceType: MODULE },
      { code: 'import"a"', sourceType: MODULE },
      { code: "import.meta", sourceType: MODULE }
    ]

    for (const { code, hint, sourceType } of datas) {
      const result = Compiler.compile(code, {
        hint,
        sourceType: MODULE
      })

      assert.strictEqual(result.sourceType, sourceType)
    }
  })

  it("should support `options.sourceType` of UNAMBIGUOUS", () => {
    const datas = [
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

    for (const { code, hint, sourceType } of datas) {
      const result = Compiler.compile(code, {
        hint,
        sourceType: UNAMBIGUOUS
      })

      assert.strictEqual(result.sourceType, sourceType)
    }
  })

  it("should support `options.generateVarDeclarations`", () => {
    const values = [
      void 0,
      false,
      true
    ]

    for (const value of values) {
      for (const sourceType of modernTypes) {
        const result = Compiler.compile('import a from "a"', {
          generateVarDeclarations: value,
          sourceType
        })

        assert.ok(result.code.includes(value ? "var a" : "let a"))
      }
    }
  })

  it('should support the "use module" directive', () => {
    const datas = [
      { code: "'use module';\"use script\";import'a'" },
      { code: "'use module';\"use script\";import.meta" },
      { code: '"use module";\'use script\';import"a"' },
      { code: '"use module";\'use script\';import.meta' },
      { code: "'use module';\"use script\";import'a'", hint: MODULE },
      { code: "'use module';\"use script\";import.meta", hint: MODULE },
      { code: '"use module";\'use script\';import"a"', hint: MODULE },
      { code: '"use module";\'use script\';import.meta', hint: MODULE }
    ]

    for (const { code, hint } of datas) {
      const result = Compiler.compile(code, {
        hint,
        sourceType: UNAMBIGUOUS
      })

      assert.strictEqual(result.sourceType, MODULE)
    }
  })

  it('should support the "use script" directive', () => {
    const datas = [
      { code: "'use script';\"use module\";import'a'", hint: SCRIPT },
      { code: "'use script';\"use module\";import.meta", hint: SCRIPT },
      { code: '"use script";\'use module\';import"a"', hint: SCRIPT },
      { code: '"use script";\'use module\';import.meta', hint: SCRIPT },
      { code: "'use script';\"use module\";import'a'" },
      { code: "'use script';\"use module\";import.meta" },
      { code: '"use script";\'use module\';import"a"' },
      { code: '"use script";\'use module\';import.meta' }
    ]

    for (const { code, hint } of datas) {
      assert.throws(
        () => Compiler.compile(code, {
          hint,
          sourceType: UNAMBIGUOUS
        }),
        /SyntaxError/
      )
    }
  })

  it("should support shebangs", () => {
    const shebang = "#!/usr/bin/env node"

    const code = [
      shebang,
      'import a from "a"'
    ].join("\n")

    for (const sourceType of modernTypes) {
      const result = Compiler.compile(code, { sourceType })

      assert.strictEqual(result.code.includes(shebang), false)
    }
  })

  it("should support trailing comments", () => {
    for (const sourceType of modernTypes) {
      const result = Compiler.compile('import"a"//trailing comment', { sourceType })

      assert.ok(result.code.endsWith("//trailing comment"))
    }
  })

  it("should compile dynamic import for SCRIPT", () => {
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

    for (const sourceType of sourceTypes) {
      const result = Compiler.compile(code, { sourceType })

      assert.strictEqual(result.code.includes("import"), false)
    }
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

    for (const sourceType of modernTypes) {
      const result = Compiler.compile(code, { sourceType })
      const lines = result.code.split("\n")

      assert.strictEqual(lines[13], "b")
    }
  })

  it("should escape newlines in source specifiers", () => {
    for (const sourceType of modernTypes) {
      const result = Compiler.compile('import"\\n\\r\\u2028\\u2029"', { sourceType })

      assert.strictEqual(/[\n\r\u2028\u2029]/.test(result.code), false)
    }
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

    for (const sourceType of modernTypes) {
      const result = Compiler.compile(code, { sourceType })

      assert.ok(result.code.endsWith("\r\n".repeat(5)))
    }
  })

  it("should not get confused by string literals", () => {
    const code = [
      "'a; import b from " + '"c"; d' + "'",
      '"a; import b " + ' + "'from " + '"c"; d' + "'"
    ].join("\n")

    for (const sourceType of sourceTypes) {
      const result = Compiler.compile(code, { sourceType })

      assert.strictEqual(result.code, code)
    }
  })

  it("should parse shorthand async function properties with reserved names", () => {
    for (const sourceType of sourceTypes) {
      assert.doesNotThrow(
        () => Compiler.compile("({ async delete() {} })", { sourceType })
      )
    }
  })

  it("should parse arrow functions with destructured arguments", () => {
    const lines = [
      "({ a = 1 }) => {}",
      "({ a = 1 }, { b = 2 }) => {}"
    ]

    for (const line of lines) {
      for (const sourceType of sourceTypes) {
        assert.doesNotThrow(() => Compiler.compile(lines, { sourceType }))
      }
    }
  })

  it("should parse transforms at the end of the source", () => {
    const lines = [
      'import { a } from "a"',
      'import "a"',
      "let a; export { a }",
      "export default a"
    ]

    for (const line of lines) {
      for (const sourceType of modernTypes) {
        assert.doesNotThrow(() => Compiler.compile(line, { sourceType }))
      }
    }
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

    for (const sourceType of modernTypes) {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    }
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

    for (const sourceType of sourceTypes) {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    }
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

    for (const sourceType of sourceTypes) {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    }
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

    for (const sourceType of sourceTypes) {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    }
  })

  it("should parse class fields syntax", () => {
    const code = [
      "export class A { a }",
      "export class B { [b] }",
      "export class C { static c }",
      "export class D { static [d] }",
      "export class E { #e }",
      "export class F { static #f }",
      "export class G { async }",
      "export class H { get }",
      "export class I { set }",
      "export class J { static }",
      "export class K {",
      "  a = 1",
      "  [b] = 1",
      "  static c = 1",
      "  static [d] = 1",
      "  static #e = 1",
      "  e() { this.#e }",
      "  static get f() {}",
      "  static set f(v) {}",
      "  static async g() {}",
      "  static *h() {}",
      "  static async *i() {}",
      "  [Symbol.iterator]() {}",
      "  async = 1;",
      "  get = 1",
      "  set = 1",
      "  static = 1",
      "  static async = 1;",
      "  static get = 1",
      "  static set = 1",
      "  static static = 1",
      "}"
    ].join("\n")

    for (const sourceType of modernTypes) {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    }
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

    for (const sourceType of modernTypes) {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    }
  })

  it("should parse object rest/spread syntax", () => {
    const code = [
      'const ab = { a: "a", b: "b" }',
      'const abc = { ...K(ab), c: "c" }',
      "export const { a, ...bc } = abc",
      "export const d = ({ a, ...bcd } = {}) => bcd",
      "export default { ...abc, d }"
    ].join("\n")

    for (const sourceType of modernTypes) {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    }
  })

  it("should transform `console` references and calls with identifier arguments", () => {
    const lines = [
      "console",
      "console.a(b)",
      'console.a("b", c)',
      'console["a"](b)',
      "new console.Console(a)",
      "class C extends console.Console {}",
      "const a = { console }",
      "const a = { [console]: console }",
      "const a = { console() { console } }",
      "const a = () => console"
    ]

    const compiled = [
      "_.g.console",
      "_.g.console.a(b)",
      '_.g.console.a("b", c)',
      '_.g.console["a"](b)',
      "new _.g.console.Console(a)",
      "class C extends _.g.console.Console {}",
      "const a = { console:_.g.console }",
      "const a = { [_.g.console]: _.g.console }",
      "const a = { console() { _.g.console } }",
      "const a = () => _.g.console"
    ]

    lines.forEach((line, index) => {
      const code = [
        'import a from "a"',
        line
      ].join("\n")

      for (const sourceType of modernTypes) {
        const result = Compiler.compile(code, { sourceType })
        const actual = result.code.split("\n").pop()

        assert.strictEqual(actual, compiled[index])
      }
    })
  })

  it("should not transform other `console` use", () => {
    const lines = [
      "typeof console",
      "console.a('b')",
      'console.a("b", \'c\')',
      'console.a("b", `c`)'
    ]

    lines.forEach((line) => {
      const code = [
        'import a from "a"',
        line
      ].join("\n")

      for (const sourceType of modernTypes) {
        const result = Compiler.compile(code, { sourceType })
        const actual = result.code.split("\n").pop()

        assert.strictEqual(actual, line)
      }
    })
  })

  it("should not transform `console` identifiers shadowed by arguments or variables", () => {
    const lines = [
      "let console = { a() {} }",
      "let a = (console) =>"
    ]

    lines.forEach((line) => {
      const code = [
        'import a from "a"',
        "{",
        line,
        "console.a(b)",
        "}"
      ].join("\n")

      for (const sourceType of modernTypes) {
        const result = Compiler.compile(code, { sourceType })

        assert.strictEqual(result.code.includes("_.g"), false)
      }
    })
  })

  it("should not transform `console` identifiers shadowed by `import` or `export` specifiers", () => {
    const lines = [
      'import console from "a"',
      'import * as console from "a"',
      "export let console = { a() {} }"
    ]

    lines.forEach((line) => {
      const code = [
        line,
        "console.a(b)"
      ].join("\n")

      for (const sourceType of modernTypes) {
        const result = Compiler.compile(code, { sourceType })

        assert.strictEqual(result.code.includes("_.g"), false)
      }
    })
  })

  it("should wrap `eval()` use", () => {
    const lines = [
      "eval",
      "function a(b, c = 1, ...d) { return eval }",
      "const a = { eval }",
      "const a = { [eval]: eval }",
      "const a = { eval() { eval } }",
      "const a = () => eval",
      "a(eval, c)",
      "new eval.b.c()",
      "`eval ${ eval } eval`",
      "switch (eval) { case eval: eval }",
      "try {} catch { eval }"
    ]

    const compiledModule = [
      "_.e",
      "function a(b, c = 1, ...d) { return _.e }",
      "const a = { eval:_.e }",
      "const a = { [_.e]: _.e }",
      "const a = { eval() { _.e } }",
      "const a = () => _.e",
      "a(_.e, c)",
      "new _.e.b.c()",
      "`eval ${ _.e } eval`",
      "switch (_.e) { case _.e: _.e }",
      "try {} catch { _.e }"
    ]

    const compiledScript = [
      "(eval===_.v?_.e:eval)",
      "function a(b, c = 1, ...d) { return (eval===_.v?_.e:eval) }",
      "const a = { eval:(eval===_.v?_.e:eval) }",
      "const a = { [(eval===_.v?_.e:eval)]: (eval===_.v?_.e:eval) }",
      "const a = { eval() { (eval===_.v?_.e:eval) } }",
      "const a = () => (eval===_.v?_.e:eval)",
      "a((eval===_.v?_.e:eval), c)",
      "new (eval===_.v?_.e:eval).b.c()",
      "`eval ${ (eval===_.v?_.e:eval) } eval`",
      "switch ((eval===_.v?_.e:eval)) { case (eval===_.v?_.e:eval): (eval===_.v?_.e:eval) }",
      "try {} catch { (eval===_.v?_.e:eval) }"
    ]

    lines.forEach((line, index) => {
      const code = [
        "",
        line
      ].join("\n")

      for (const sourceType of sourceTypes) {
        const result = Compiler.compile(code, { sourceType })
        const actual = result.code.split("\n").pop()
        const compiled = sourceType === SCRIPT ? compiledScript : compiledModule

        assert.strictEqual(actual, compiled[index])
      }
    })
  })

  it("should not wrap shadowed `eval()`", () => {
    const lines = [
      "function a(eval) { eval = eval }",
      "function a(...eval) { eval = eval }",
      "function a(eval = 1) { eval = eval }",
      "const a = { eval: 1 }",
      "const a = function eval() { eval = eval }",
      "try {} catch(eval) { eval = eval }",
      "eval: while (true) { break eval; continue eval }"
    ]

    for (const line of lines) {
      const result = Compiler.compile(line)

      assert.strictEqual(result.code, line)
    }
  })

  it("should not wrap `eval()` in `typeof` expressions", () => {
    const line = "typeof eval"

    const code = [
      "",
      line
    ].join("\n")

    for (const sourceType of sourceTypes) {
      const result = Compiler.compile(code, { sourceType })
      const actual = result.code.split("\n").pop()

      assert.strictEqual(actual, line)
    }
  })

  it("should not wrap `eval()` in `with` statements", () => {
    const code = [
      "",
      "with (eval) { eval = eval }"
    ].join("\n")

    const result = Compiler.compile(code)
    const actual = result.code.split("\n").pop()

    assert.strictEqual(actual, "with ((eval===_.v?_.e:eval)) { eval = eval }")
  })

  it("should add TDZ asserts to bindings", () => {
    const lines = [
      "tdz",
      "function a(b, c = 1, ...d) { return tdz }",
      "const a = { tdz }",
      "const a = { [tdz]: tdz }",
      "const a = { tdz() { tdz } }",
      "const a = () => tdz",
      "a(tdz, c)",
      "new tdz.b.c()",
      "`tdz ${ tdz } tdz`",
      "switch (tdz) { case tdz: tdz }",
      "try {} catch { tdz }"
    ]

    const compiled = [
      '_.a("tdz",tdz)',
      'function a(b, c = 1, ...d) { return _.a("tdz",tdz) }',
      'const a = { tdz:_.a("tdz",tdz) }',
      'const a = { [_.a("tdz",tdz)]: _.a("tdz",tdz) }',
      'const a = { tdz() { _.a("tdz",tdz) } }',
      'const a = () => _.a("tdz",tdz)',
      'a(_.a("tdz",tdz), c)',
      'new (_.a("tdz",tdz)).b.c()',
      '`tdz ${ _.a("tdz",tdz) } tdz`',
      'switch (_.a("tdz",tdz)) { case _.a("tdz",tdz): _.a("tdz",tdz) }',
      'try {} catch { _.a("tdz",tdz) }'
    ]

    lines.forEach((line, index) => {
      const code = [
        'import tdz from "tdz"',
        line
      ].join("\n")

      for (const sourceType of modernTypes) {
        const result = Compiler.compile(code, { sourceType })
        const actual = result.codeWithTDZ.split("\n").pop()

        assert.strictEqual(actual, compiled[index])
      }
    })
  })

  it("should not add TDZ asserts to shadowed bindings", () => {
    const lines = [
      "function a(tdz) { tdz = tdz }",
      "function a(...tdz) { tdz = tdz }",
      "function a(tdz = 1) { tdz = tdz }",
      "const a = { tdz: 1 }",
      "const a = function tdz() { tdz = tdz }",
      "try {} catch(tdz) { tdz = tdz }",
      "tdz: while (true) { break tdz; continue tdz }"
    ]

    for (const line of lines) {
      const code = [
        'import tdz from "tdz"',
        line
      ].join("\n")

      for (const sourceType of modernTypes) {
        const result = Compiler.compile(code, { sourceType })

        assert.strictEqual(result.codeWithTDZ, null)
      }
    }
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

  it("should lexically scope top-level function declarations for MODULE", () => {
    const lines = [
      "var a; function a() {}",
      "function a() {}; var a"
    ]

    const suffix = "; export {}"

    for (const sourceType of modernTypes) {
      for (const line of lines) {
        assert.throws(
          () => Compiler.compile(line + suffix, { sourceType }),
          /SyntaxError: Identifier 'a' has already been declared/
        )
      }

      assert.doesNotThrow(
        () => Compiler.compile("function a() { var b; function b() {} }" + suffix, { sourceType })
      )
    }
  })

  it("should not lexically scope top-level function declarations for SCRIPT", () => {
    const lines = [
      "var a; function a() {}",
      "function a() {}; var a"
    ]

    const suffix = '; import("a")'

    for (const line of lines) {
      assert.doesNotThrow(() => Compiler.compile(line + suffix, { sourceType: SCRIPT }))
    }
  })
})
