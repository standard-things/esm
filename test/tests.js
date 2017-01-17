var assert = require("assert");
var hasOwn = Object.prototype.hasOwnProperty;

describe("import declarations", function () {
  it("should work in nested scopes", function () {
    import { name, id } from "./name";
    assert.strictEqual(name, "name.js");
    assert.strictEqual(id.split("/").pop(), "name.js");
  });

  it("should cope with dependency cycles", function () {
    import { check as aCheck } from "./cycle-a";
    aCheck();

    import { check as bCheck } from "./cycle-a";
    bCheck();
  });

  it("should support combinations of import styles", function () {
    import * as abc1 from "./abc";
    import abc2, * as abc3 from "./abc";
    import { default as abc4 } from "./abc";
    import abc5, { a as ay, b as bee, c } from "./abc";

    assert.deepEqual(abc1, {
      a: "a",
      b: "b",
      c: "c"
    });

    assert.deepEqual(abc1, abc2);
    assert.deepEqual(abc1, abc3);
    assert.deepEqual(abc1, abc4);
    assert.deepEqual(abc1, abc5);
  });

  it("should import module.exports as default, by default", function () {
    import def from "./export/common.js";
    assert.strictEqual(def, "pure CommonJS");
  });
});

describe("export declarations", function () {
  it("should allow * exports", function () {
    import def, {
      a, b, c as d,
    } from "./export-all.js";

    assert.strictEqual(a, "a");
    assert.strictEqual(b, "b");
    assert.strictEqual(d, "c");
    assert.strictEqual(def, "default");
  });

  it("should allow re-exporting import * alongside export *", function () {
    import {
      Abc, d, e, f,
    } from "./export-all-multiple.js";

    assert.strictEqual(Abc.a, "a");
    assert.strictEqual(Abc.b, "b");
    assert.strictEqual(Abc.c, "c");
    assert.strictEqual(d, "d");
    assert.strictEqual(e, "e");
    assert.strictEqual(f, "f");
  });

  it("should tolerate mutual * exports", function () {
    import { a as aa, b as ab } from "./export/all-mutual-a.js";
    import { a as ba, b as bb } from "./export/all-mutual-b.js";
    assert.strictEqual(aa, "a");
    assert.strictEqual(ab, "b");
    assert.strictEqual(ba, "a");
    assert.strictEqual(bb, "b");
  });

  it("should allow named re-exports", function test() {
    import { a, c, v, si } from "./export-some.js";
    assert.strictEqual(a, "a");
    assert.strictEqual(c(), "c");
    assert.strictEqual(v, "b");
    assert.strictEqual(si, "cee");
  });

  it("should be able to contain import declarations", function () {
    import { outer } from "./nested";
    assert.deepEqual(outer(), ["a", "b", "c"]);
  });

  it("should support default declarations", function () {
    import g, { check } from "./default-function";
    check(g);
  });

  it("should support default expressions", function () {
    import count from "./default-expression";
    assert.strictEqual(count, 1);
  });

  it("should be able to invoke setters later", function (done) {
    import def, {
      val,
      exportAgain,
      exportYetAgain,
      oneLastExport
    } from "./export/later";

    assert.strictEqual(def, "default-1");
    assert.strictEqual(val, "value-1");

    exportAgain();
    assert.strictEqual(def, "default-2");
    assert.strictEqual(val, "value-2");

    exportYetAgain();
    assert.strictEqual(def, "default-3");
    assert.strictEqual(val, "value-2");

    setTimeout(function () {
      oneLastExport();
      assert.strictEqual(def, "default-3");
      assert.strictEqual(val, "value-3");
      done();
    }, 0);
  });

  import { Script } from "vm";

  var canUseClasses = false;
  var canUseLetConst = false;
  var canUseDestructuring = false;

  try {
    // Test if Node supports class syntax.
    new Script("class A {}");
    canUseClasses = true;
  } catch (e) {}

  try {
    // Test if Node supports block declaration syntax.
    new Script("let x; const y = 1234");
    canUseLetConst = true;
  } catch (e) {}

  try {
    // Test if Node supports destructuring declarations.
    new Script("var { x, y } = {}");
    canUseDestructuring = true;
  } catch (e) {}

  it("should support all default syntax", function () {
    import number from "./export/default/number";
    assert.strictEqual(number, 42);

    import object from "./export/default/object";
    assert.deepEqual(object, {
      foo: 42
    });

    import array from "./export/default/array";
    assert.deepEqual(array, [1, 2, 3]);

    import func from "./export/default/function";
    assert.strictEqual(func(), func);

    import ident from "./export/default/identifier";
    assert.strictEqual(ident, 42);

    if (canUseClasses) {
      import Anon from "./export/default/anon-class";
      assert.strictEqual(new Anon(1234).value, 1234);

      import Named from "./export/default/named-class";
      assert.strictEqual(new Named(56, 78).sum, 56 + 78);
    }
  });

  it("should support basic declaration syntax", function () {
    import { a, b, c, d } from "./export/declarations/basic";

    assert.strictEqual(a, 1);
    assert.strictEqual(b(), d);
    assert.strictEqual(c, "c");
    assert.strictEqual(d(), b);
  });

  (canUseLetConst ? it : xit)(
    "should support block declaration syntax", function () {
    import { a, b, c } from "./export/declarations/block";

    assert.strictEqual(a, 1);
    assert.strictEqual(b, 2);
    assert.strictEqual(c, 3);
  });

  it("should support all named export syntax", function () {
    var exp = require("./export/names");

    assert.strictEqual(exp.foo, "foo");
    assert.strictEqual(exp.bar, "bar");
    assert.strictEqual(exp.baz, "baz");
    assert.strictEqual(exp.foo2, "foo");
    assert.strictEqual(exp.foo3, "foo");
    assert.strictEqual(exp.baz2, "baz");
    assert.strictEqual(exp.default, "foo");

    import foo from "./export/names";
    assert.strictEqual(foo, "foo");
  });

  it("should tolerate one-to-many renamed exports", function () {
    import { x, y, append } from "./export/renamed";

    assert.strictEqual(x, y);
    assert.strictEqual(x, "a");

    assert.strictEqual(append("b"), "ab");

    assert.strictEqual(x, y);
    assert.strictEqual(x, "ab");

    assert.strictEqual(append("c"), "abc");

    assert.strictEqual(x, y);
    assert.strictEqual(x, "abc");
  });

  it("should support all export-from syntax", function () {
    import def, { a, b, c, ay, bee, foo } from "./export/from";

    assert.strictEqual(def, "a");
    assert.strictEqual(a, "a");
    assert.strictEqual(b, "b");
    assert.strictEqual(c, "c");
    assert.strictEqual(ay, "a");
    assert.strictEqual(bee, "b");
    assert.deepEqual(foo, {
      a: "a",
      b: "b",
      c: "c"
    });
  });

  it("should support export { default } from ... syntax", function () {
    import object from "./export/default/from";
    assert.deepEqual(object, {
      foo: 42
    });
  });

  it("should support braceless-if nested imports", function () {
    assert.strictEqual(typeof x, "undefined");
    for (var i = 0; i < 2; ++i) {
      if (i === 0) import { a as x } from "./abc";
      if (i === 1) import { b as x } from "./abc";
      assert.strictEqual(x, i ? "b": "a");
    }
    assert.strictEqual(x, "b");
  });

  it("should support switch-case nested imports", function () {
    assert.strictEqual(typeof x, "undefined");

    for (var i = 0; i < 2; ++i) {
      switch (i) {
      case 0:
        import { a as x } from "./abc";
        break;
      case 1:
        import { b as x } from "./abc";
        break;
      }

      assert.strictEqual(x, i ? "b": "a");
    }

    assert.strictEqual(x, "b");
  });

  (canUseDestructuring ? it : xit)(
    "should support destructuring declarations", function () {
    import { a, c as b, d, x, y, rest } from "./export/destructuring.js";

    assert.strictEqual(a, "a");
    assert.strictEqual(b, "b");
    assert.strictEqual(d, 1234);
    assert.strictEqual(x, 1);
    assert.strictEqual(y, 2);
    assert.deepEqual(rest, [a, b, d]);
  });

  (canUseDestructuring ? it : xit)(
  "should invoke destructuring setters later", function () {
    import { x, y, swap } from "./export/swap-later.js";
    assert.strictEqual(x, 1);
    assert.strictEqual(y, 2);
    swap();
    assert.strictEqual(x, 2);
    assert.strictEqual(y, 1);
  });
});

describe("module.runModuleSetters", function () {
  it("should be called after eval(...)", function () {
    import { value, run } from "./eval";
    assert.strictEqual(value, "original");
    var result = run('localValue = "modified"');
    assert.strictEqual(value, result);
    assert.strictEqual(value, "modified");
  });
});

describe("parent setters", function () {
  it("should be run when children update exports", function () {
    import { c } from "./setters/parent";
    import { increment } from "./setters/grandchild";
    assert.strictEqual(c, 0);
    increment();
    assert.strictEqual(c, 1);
  });

  it("should not be called if replaced", function () {
    import { value, reset, add } from "./live.js";

    var firstCallCount = 0;
    var secondCallCount = 0;

    module.import("./live.js", {
      value: function (v) {
        ++firstCallCount;
        value = "first:" + v;
      }
    }, "key");

    assert.strictEqual(firstCallCount, 1);
    assert.strictEqual(value, "first:0");
    add(3);
    assert.strictEqual(firstCallCount, 2);
    assert.strictEqual(value, "first:3");
    assert.strictEqual(secondCallCount, 0);

    module.import("./live.js", {
      value: function (v) {
        ++secondCallCount;
        value = "second:" + v;
      }
    }, "key");

    assert.strictEqual(firstCallCount, 2);
    assert.strictEqual(secondCallCount, 1);
    assert.strictEqual(value, "second:3");
    add(4);
    assert.strictEqual(firstCallCount, 2);
    assert.strictEqual(secondCallCount, 2);
    assert.strictEqual(value, "second:7");
  });
});

describe("spec compliance", function () {
  it("should establish live binding of values", function () {
    import { value, reset, add } from "./live";
    reset();
    assert.equal(value, 0);
    add(2);
    assert.equal(value, 2);
  });

  it("should execute modules in the correct order", function () {
    import { getLog } from "./order-tracker";
    import "./order-c";
    assert.deepEqual(getLog(), ["a", "b", "c"]);
  });

  it("should bind exports before the module executes", function () {
    import value from "./export-cycle-a";
    assert.equal(value, true);
  });
});

describe("built-in modules", function () {
  it("should fire setters if already loaded", function () {
    // The "module" module is required in ../lib/node.js before we begin
    // compiling anything.
    import { Module as M } from "module";
    assert.ok(module instanceof M);
  });
});

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

    assert.strictEqual(hasOwn.call(result, "ast"), false);
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
    isCallExprStmt(ast.body[1], "module", "import");
    isVarDecl(ast.body[2], ["bar"]);
    isCallExprStmt(ast.body[3], "module", "import");
    isCallExprStmt(ast.body[4], "console", "log");
    isCallExprStmt(ast.body[5], "module", "export");
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

describe("Node REPL", function () {
  import { createContext } from "vm";
  import "../repl";

  it("should work with global context", function (done) {
    var repl = require("repl").start({
      useGlobal: true
    });

    assert.strictEqual(typeof assertStrictEqual, "undefined");

    repl.eval(
      'import { strictEqual as assertStrictEqual } from "assert"',
      null, // context
      "repl", // filename
      function (err, result) {
        // Use the globally-defined assertStrictEqual to test itself!
        assertStrictEqual(typeof assertStrictEqual, "function");
        done();
      }
    );
  });

  it("should work with non-global context", function (done) {
    var repl = require("repl").start({
      useGlobal: false
    });

    var context = createContext({
      module: module
    });

    repl.eval(
      'import { strictEqual } from "assert"',
      context,
      "repl", // filename
      function (err, result) {
        // Use context.strictEqual to test itself!
        context.strictEqual(typeof context.strictEqual, "function");
        done();
      }
    );
  });
});
