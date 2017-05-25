const assert = require("assert");

function isUseStrictExprStmt(stmt) {
  return stmt.type === "ExpressionStatement" &&
    stmt.expression.value === "use strict";
}

describe("compiler", () => {
  it("should not get confused by string literals", () => {
    assert.strictEqual(
      'a; import b from "c"; d',
      "a; import b " + 'from "c"; d'
    );

    assert.strictEqual(
      'a; export {a} from "a"; b;',
      "a; export {a" + '} from "a"; b;'
    );
  });

  it("should not be enabled for nested node_modules", () => {
    let error;

    try {
      import "disabled";
    } catch (e) {
      error = e;
    }

    assert.ok(error instanceof SyntaxError);
    assert.ok(/unexpected/i.test(error.message));
  });

  it("should choose a unique module identifier", () => {
    const module = null, module2 = null;
    import { a } from "./misc/abc";
    assert.strictEqual(a, "a");
  });

  it("should be enabled for packages that depend on reify", () => {
    import a from "enabled";
    assert.strictEqual(a, assert);
  });

  it("should preserve line numbers", () => {
    import check from "./compiler/lines.js";
    check();
  });

  it('should not hoist above "use strict"', () => {
    import { check } from "./compiler/strict";
    assert.strictEqual(check(), true);
  });

  it("should respect options.generateArrowFunctions", () => {
    import { compile } from "../lib/compiler.js";

    const code = "export let a = 1;";

    const withoutArrow = compile(code, {
      generateArrowFunctions: false
    }).code;

    assert.ok(! withoutArrow.includes("=>"));

    const withArrow = compile(code, {
      generateArrowFunctions: true
    }).code;

    assert.ok(withArrow.includes("=>"));

    // No options.generateArrowFunctions is the same as
    // { generateArrowFunctions: true }.
    const defaultArrow = compile(code).code;

    assert.ok(defaultArrow.includes("=>"));
  });

  it("should respect options.generateLetDeclarations", () => {
    import { compile } from "../lib/compiler.js";

    const code = 'import def from "mod"';

    const withLet = compile(code, {
      generateLetDeclarations: true
    }).code;

    assert.ok(withLet.startsWith("let def;"));

    const withoutLet = compile(code, {
      generateLetDeclarations: false
    }).code;

    assert.ok(withoutLet.startsWith("var def;"));

    // No options.generateLetDeclarations is the same as
    // { generateLetDeclarations: false }.
    const defaultLet = compile(code).code;

    assert.ok(defaultLet.startsWith("var def;"));
  });

  it("should respect options.generateShorthandMethodNames", () => {
    import { compile } from "../lib/compiler.js";

    const code = 'import def from "mod"';

    const withoutShorthand = compile(code, {
      generateShorthandMethodNames: false
    }).code;

    assert.ok(withoutShorthand.includes(":function"));

    const withShorthand = compile(code, {
      generateShorthandMethodNames: true
    }).code;

    assert.ok(! withShorthand.includes(":function"));

    // No options.generateShorthandMethodNames is the same as
    // { generateShorthandMethodNames: true }.
    const defaultShorthand = compile(code).code;

    assert.ok(! defaultShorthand.includes(":function"));
  });

  it("should respect options.modifyAST", () => {
    import { compile } from "../lib/compiler.js";

    function isVarDecl(node, names) {
      assert.strictEqual(node.type, "VariableDeclaration");
      assert.deepEqual(node.declarations.map((decl) => decl.id.name), names);
    }

    function isCallExprStmt(node, objectName, propertyName) {
      assert.strictEqual(node.type, "ExpressionStatement");
      assert.strictEqual(node.expression.type, "CallExpression");
      assert.strictEqual(
        node.expression.callee.object.name, objectName);
      assert.strictEqual(
        node.expression.callee.property.name, propertyName);
    }

    const code = [
      "console.log(foo, bar);",
      'import foo from "./foo"',
      'import bar from "./bar"',
      "export default foo + bar;"
    ].join("\n");

    let ast = compile(code, { modifyAST: true }).ast;

    if (ast.type === "File") {
      ast = ast.program;
    }

    assert.strictEqual(ast.type, "Program");

    const firstIndex = isUseStrictExprStmt(ast.body[0]) ? 1 : 0;
    assert.strictEqual(ast.body.length - firstIndex, 6);

    isVarDecl(ast.body[firstIndex + 0], ["foo"]);
    isCallExprStmt(ast.body[firstIndex + 1], "module", "watch");
    isVarDecl(ast.body[firstIndex + 2], ["bar"]);
    isCallExprStmt(ast.body[firstIndex + 3], "module", "watch");
    isCallExprStmt(ast.body[firstIndex + 4], "console", "log");
    isCallExprStmt(ast.body[firstIndex + 5], "module", "exportDefault");
  });

  it("should allow pre-parsed ASTs via options.parse", () => {
    import { compile } from "../lib/compiler.js";
    import { parse } from "../lib/parser";

    const code = 'import foo from "./foo"';
    const ast = parse(code);
    const illegal = code.replace(/\bfoo\b/g, "+@#");
    const result = compile(illegal, {
      generateLetDeclarations: true,
      // If you really want to avoid parsing, you can provide an
      // options.parse function that returns whatever AST you like.
      parse: () => ast
    });

    assert.strictEqual(result.ast, ast);
    assert.ok(result.code.startsWith("let foo"));
    assert.ok(result.code.includes('"./+@#"'));
  });

  it("should respect options.sourceType", () => {
    import { compile } from "../lib/compiler.js";

    const code = 'import "a"';
    const sourceTypes = [void 0, "module", "unambiguous"];

    sourceTypes.forEach((sourceType) => {
      const result = compile(code, { sourceType });
      assert.ok(result.code.includes("module.watch"));
    });

    const scriptType = compile(code, {
      sourceType: "script"
    }).code;

    assert.strictEqual(scriptType, code);
  });

  it("should transform default export declaration to expression", () => {
    import { compile } from "../lib/compiler.js";

    function parse(code) {
      let ast = compile(code, { modifyAST: true }).ast;

      if (ast.type === "File") {
        ast = ast.program;
      }

      assert.strictEqual(ast.type, "Program");

      return ast;
    }

    const anonCode = "export default class {}";
    const anonAST = parse(anonCode);
    const anonFirstIndex =
      isUseStrictExprStmt(anonAST.body[0]) ? 1 : 0;

    assert.strictEqual(anonAST.body.length - anonFirstIndex, 1);
    assert.strictEqual(
      anonAST.body[anonFirstIndex].expression.arguments[1].type,
      "ClassExpression"
    );

    const namedCode = "export default class C {}";
    const namedAST = parse(namedCode);
    const namedFirstIndex =
      isUseStrictExprStmt(namedAST.body[0]) ? 1 : 0;

    assert.strictEqual(namedAST.body.length - namedFirstIndex, 2);
    assert.strictEqual(
      namedAST.body[namedFirstIndex + 1].type,
      "ClassDeclaration"
    );
  });

  it("should not get confused by shebang", () => {
    import { compile } from "../lib/compiler.js";

    const code = [
      "#!/usr/bin/env node -r reify",
      'import a from "a"',
    ].join("\n");

    const result = compile(code);
    assert.ok(result.code.startsWith("var a;"));
  });

  it("should not get confused by trailing comments", () => {
    import { compile } from "../lib/compiler.js";

    const result = compile('import "a" // trailing comment');
    assert.ok(result.code.endsWith("// trailing comment"));
  });

  it("should preserve crlf newlines", () => {
    import { compile } from "../lib/compiler.js";

    const code = [
      "import {",
      "  strictEqual,",
      "  // blank line",
      "  deepEqual",
      "}",
      'from "assert";'
    ].join("\r\n");

    const result = compile(code, { repl: true });
    assert.ok(result.code.endsWith("\r\n".repeat(5)));
  });
});
