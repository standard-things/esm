const assert = require("assert");

describe("compiler", () => {
  it("should not get confused by string literals", () => {
    assert.strictEqual(
      'a; import b from "c"; d',
      'a; import b ' + 'from "c"; d'
    );

    assert.strictEqual(
      'a; export {a} from "a"; b;',
      'a; export {a' + '} from "a"; b;'
    );
  });

  it("should not be enabled for nested node_modules", () => {
    let threw = true;
    try {
      import "disabled";
      threw = false;
    } catch (e) {
      assert.ok(e instanceof SyntaxError);
      assert.ok(/unexpected/i.test(e.message));
    }
    assert.strictEqual(threw, true);
  });

  it("should be enabled for packages that depend on reify", () => {
    import a from "enabled";
    assert.strictEqual(a, assert);
  });

  it("should preserve line numbers", () => {
    import check from "./lines.js";
    check();
  });

  it('should not hoist above "use strict"', () => {
    import { check } from "./strict";
    assert.strictEqual(check(), true);
  });

  it("should respect options.generateLetDeclarations", () => {
    import { compile } from "../lib/compiler.js";

    const withLet = compile('import foo from "./foo"', {
      generateLetDeclarations: true
    }).code;

    assert.ok(withLet.startsWith('"use strict";let foo;'));

    const without = compile('import foo from "./foo"', {
      generateLetDeclarations: false
    }).code;

    assert.ok(without.startsWith('"use strict";var foo;'));

    // No options.generateLetDeclarations is the same as
    // { generateLetDeclarations: false }.
    assert.ok(compile(
      'import foo from "./foo"'
    ).code.startsWith('"use strict";var foo;'));
  });

  it("should allow pre-parsed ASTs via options.parse", () => {
    import { compile } from "../lib/compiler.js";
    import { parse } from "../lib/parsers/default.js";

    const code = 'import foo from "./foo"';
    const ast = parse(code);
    const illegal = code.replace(/\bfoo\b/g, "+@#");
    const result = compile(illegal, {
      generateLetDeclarations: true,
      // If you really want to avoid parsing, you can provide an
      // options.parse function that returns whatever AST you like.
      parse: () => ast
    });

    assert.strictEqual(result.ast, null);
    assert.ok(result.code.startsWith('"use strict";let foo'));
    assert.ok(result.code.includes('"./+@#"'));
  });

  it("should transform AST when options.ast truthy", () => {
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

    const result = compile(code, { ast: true });
    let ast = result.ast;

    if (ast.type === "File") {
      ast = ast.program;
    }

    assert.strictEqual(ast.type, "Program");

    const firstIndex = isUseStrictExprStmt(ast.body[0]) ? 1 : 0;
    assert.strictEqual(ast.body.length - firstIndex, 6);

    isVarDecl(ast.body[firstIndex + 0], ["foo"]);
    isCallExprStmt(ast.body[firstIndex + 1], "module", "importSync");
    isVarDecl(ast.body[firstIndex + 2], ["bar"]);
    isCallExprStmt(ast.body[firstIndex + 3], "module", "importSync");
    isCallExprStmt(ast.body[firstIndex + 4], "console", "log");
    isCallExprStmt(ast.body[firstIndex + 5], "module", "export");
  });

  function isUseStrictExprStmt(stmt) {
    return stmt.type === "ExpressionStatement" &&
      stmt.expression.value === "use strict";
  }

  it("should transform default export declaration to expression", () => {
    import { compile } from "../lib/compiler.js";

    function parse(code) {
      const result = compile(code, { ast: true });
      let ast = result.ast;

      if (ast.type === "File") {
        ast = ast.program;
      }

      assert.strictEqual(ast.type, "Program");

      return ast;
    }

    const anonCode = [
      "export default class {}"
    ].join("\n");

    const anonAST = parse(anonCode);

    const anonFirstIndex =
      isUseStrictExprStmt(anonAST.body[0]) ? 1 : 0;

    assert.strictEqual(anonAST.body.length - anonFirstIndex, 1);
    assert.strictEqual(
      anonAST.body[anonFirstIndex].expression.arguments[1].right.type,
      "ClassExpression"
    );

    const namedCode = [
      "export default class C {}"
    ].join("\n");

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
      'import foo from "./foo"',
    ].join("\n");

    const withShebang = compile(code).code;
    assert.ok(withShebang.startsWith('"use strict";var foo'));
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

    const result = compile(code).code;
    assert.ok(result.endsWith("\r\n".repeat(5)));
  });
});
