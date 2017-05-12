const assert = require("assert");

describe("dynamic import", () => {
  it("should support the import() function", (done) => {
    import("./misc/abc").then((ns) => {
      assert.deepEqual(ns, { a: "a", b: "b", c: "c" });
      done();
    });
  });
});
