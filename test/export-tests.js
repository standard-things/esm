var assert = require("assert");
var parserSupportsExportFromExtensions =
  process.env.REIFY_PARSER === "babylon";

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

    import anonFunc from "./export/default/anon-function";
    assert.strictEqual(anonFunc(3), 4);

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

  (parserSupportsExportFromExtensions ? it : xit
  )("should support export-from extensions", function () {
    import {
      def1, def2, def3,
      ns1, ns2, ns3,
      a, b, c, d
    } from "./export/from-extensions";

    import def, {
      a as _a,
      b as _b,
      b as _c,
      c as _d,
    } from "./abc";

    assert.strictEqual(def, def1);
    assert.strictEqual(def, def2);
    assert.strictEqual(def, def3);

    function checkNS(ns) {
      assert.deepEqual(ns, def);
      assert.notStrictEqual(ns, def);
    }

    checkNS(ns1);
    checkNS(ns2);
    checkNS(ns3);

    assert.strictEqual(a, _a);
    assert.strictEqual(b, _b);
    assert.strictEqual(c, _c);
    assert.strictEqual(d, _d);
  });

  it("should support export { default } from ... syntax", function () {
    import object from "./export/default/from";
    assert.deepEqual(object, {
      foo: 42
    });
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
