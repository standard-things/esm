import assert from "assert";
import { compile } from "../lib/compiler.js";
import { join } from "path";

const canEnforceArgCount = process.env.REIFY_PARSER !== "babylon";
const canUseToStringTag = typeof Symbol === "function" &&
  typeof Symbol.toStringTag === "symbol";

describe("dynamic import", () => {
  const id = "./misc/abc";

  it("should transpile to module.import", () => {
    let callCount = 0;
    const moduleImport = module.import;

    module.import = function (id) {
      callCount++;
      return moduleImport.call(this, id);
    };

    import("./misc/abc");
    module.import = moduleImport;
    assert.strictEqual(callCount, 1);
  });

  it("should resolve as a namespace import", () =>
    import("./misc/abc").then((ns) => {
      const nsTag = canUseToStringTag ? "[object Module]" : "[object Object]";
      assert.strictEqual(Object.prototype.toString.call(ns), nsTag);
      assert.deepEqual(ns, { a: "a", b: "b", c: "c" });
    })
  );

  it("should establish live binding of values", () =>
    import("./misc/live").then((ns) => {
      ns.reset();
      assert.equal(ns.value, 0);
      ns.add(2);
      assert.equal(ns.value, 2);
    })
  );

  it("should support a variable id", () =>
    import(id)
      .then((ns) => assert.deepEqual(ns, { a: "a", b: "b", c: "c" }))
  );

  it("should support a template string id", () =>
    import(`${id}`)
      .then((ns) => assert.deepEqual(ns, { a: "a", b: "b", c: "c" }))
  );

  it("should support an expression id", () =>
    import((() => id)())
      .then((ns) => assert.deepEqual(ns, { a: "a", b: "b", c: "c" }))
  );

  it("should support the file protocol", () =>
    import("file://" + join(__dirname, id))
      .then((ns) => assert.deepEqual(ns, { a: "a", b: "b", c: "c" }))
  );

  it("should support whitespace between `import`, `(`, and `)`", () =>
    import

    (
    "./misc/abc"
    )

    .then((ns) => assert.deepEqual(ns, { a: "a", b: "b", c: "c" }))
  );

  it("should support import() in an assignment", () => {
    const p = import("./misc/abc");
    assert.ok(p instanceof Promise);
  });

  it("should support import() in a function", () => {
    function p() {
      return import("./misc/abc");
    }

    assert.ok(p() instanceof Promise);
  });

  it("should support import() with yield", () => {
    function* p() {
      yield import("./misc/abc");
    }

    assert.ok(p());
  });

  (canEnforceArgCount ? it : xit)(
  "should expect exactly one argument", () => {
    assert.ok([
      "import()",
      "import(a,b)",
      "import(...[a])",
      "import.then()",
      "import.call(a,b)"
    ].every((code) => {
      try {
        compile(code);
      } catch (e) {
        return e instanceof SyntaxError;
      }
    }));
  });
});
