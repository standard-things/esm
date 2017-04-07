var assert = require("assert");

describe("compiler", function () {
  it("should not get confused by string literals", function () {
    assert.strictEqual(
      'a; import b from "c"; d',
      'a; import b ' + 'from "c"; d'
    );

    assert.strictEqual(
      'a; export {a} from "a"; b;',
      'a; export {a' + '} from "a"; b;'
    );
  });

  it("should not be enabled for nested node_modules", function () {
    var threw = true;
    try {
      import "disabled";
      threw = false;
    } catch (e) {
      assert.ok(e instanceof SyntaxError);
      assert.ok(/unexpected/i.test(e.message));
    }
    assert.strictEqual(threw, true);
  });

  it("should be enabled for packages that depend on reify", function () {
    import a from "enabled";
    assert.strictEqual(a, assert);
  });

  it("should preserve line numbers", function () {
    import check from "./lines.js";
    check();
  });

  it("should not force strict mode", function () {
    var foo = 1234;
    delete foo;
  });

  it('should not hoist above "use strict"', function () {
    import { check } from "./strict";
    assert.strictEqual(check(), true);
  });

  it("should respect options.generateLetDeclarations", function () {
    import { compile } from "../lib/compiler.js";

    var withLet = compile('import foo from "./foo"', {
      generateLetDeclarations: true
    }).code;

    assert.strictEqual(withLet.indexOf("let foo;"), 0);

    var without = compile('import foo from "./foo"', {
      generateLetDeclarations: false
    }).code;

    assert.strictEqual(without.indexOf("var foo;"), 0);

    // No options.generateLetDeclarations is the same as
    // { generateLetDeclarations: false }.
    assert.strictEqual(compile(
      'import foo from "./foo"'
    ).code.indexOf("var foo;"), 0);
  });

  it("should allow pre-parsed ASTs via options.parse", function () {
    import { compile } from "../lib/compiler.js";
    import { parse } from "../lib/parsers/default.js";

    var code = 'import foo from "./foo"';
    var ast = parse(code);
    var illegal = code.replace(/\bfoo\b/g, "+@#");
    var result = compile(illegal, {
      generateLetDeclarations: true,
      parse: function (code) {
        // If you really want to avoid parsing, you can provide an
        // options.parse function that returns whatever AST you like.
        return ast;
      }
    });

    assert.strictEqual(result.ast, null);
    assert.strictEqual(result.code.indexOf("let foo"), 0);
    assert(result.code.indexOf('"./+@#"') >= 0);
  });

  it("should transform AST when options.ast truthy", function () {
    import { compile } from "../lib/compiler.js";

    var code = [
      "console.log(foo, bar);",
      'import foo from "./foo"',
      'import bar from "./bar"',
      "export default foo + bar;"
    ].join("\n");

    var result = compile(code, { ast: true });
    var ast = result.ast;

    function isVarDecl(node, names) {
      assert.strictEqual(node.type, "VariableDeclaration");
      assert.deepEqual(node.declarations.map(function (decl) {
        return decl.id.name;
      }), names);
    }

    function isCallExprStmt(node, objectName, propertyName) {
      assert.strictEqual(node.type, "ExpressionStatement");
      assert.strictEqual(node.expression.type, "CallExpression");
      assert.strictEqual(
        node.expression.callee.object.name, objectName);
      assert.strictEqual(
        node.expression.callee.property.name, propertyName);
    }

    if (ast.type === "File") {
      ast = ast.program;
    }

    assert.strictEqual(ast.type, "Program");
    assert.strictEqual(ast.body.length, 6);

    isVarDecl(ast.body[0], ["foo"]);
    isCallExprStmt(ast.body[1], "module", "importSync");
    isVarDecl(ast.body[2], ["bar"]);
    isCallExprStmt(ast.body[3], "module", "importSync");
    isCallExprStmt(ast.body[4], "console", "log");
    isCallExprStmt(ast.body[5], "module", "export");
  });

  it("should transform default export declaration to expression", function () {
    import { compile } from "../lib/compiler.js";

    function parse(code) {
      var result = compile(code, { ast: true });
      var ast = result.ast;

      if (ast.type === "File") {
        ast = ast.program;
      }

      assert.strictEqual(ast.type, "Program");

      return ast;
    }

    var anonCode = [
      "export default class {}"
    ].join("\n");

    var anonAST = parse(anonCode);

    assert.strictEqual(anonAST.body.length, 1);

    assert.strictEqual(
      anonAST.body[0].expression.arguments[1].right.type,
      "ClassExpression"
    );

    var namedCode = [
      "export default class C {}"
    ].join("\n");

    var namedAST = parse(namedCode);

    assert.strictEqual(namedAST.body.length, 2);

    assert.strictEqual(
      namedAST.body[1].type,
      "ClassDeclaration"
    );
  });

  it("should not get confused by shebang", function () {
    import { compile } from "../lib/compiler.js";

    var code = [
      "#!/usr/bin/env node -r reify",
      'import foo from "./foo"',
    ].join("\n");

    var withShebang = compile(code).code;
    assert.strictEqual(withShebang.indexOf('var foo'), 0)
  });
});
