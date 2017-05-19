import assert from "assert";
import { relative } from "path";
import {
  compile,
  transform,
  makeUniqueId,
} from "../lib/compiler.js";
import { prettyPrint } from "recast";
import { files } from "./all-files.js";

describe("compiler.transform", () => {
  function check(options) {
    Object.keys(files).forEach(function (absPath) {
      if (typeof options.reject === "function" &&
          options.reject(relative(__dirname, absPath))) {
        return;
      }

      const code = files[absPath];
      const ast = options.parse(code);

      options.moduleAlias = makeUniqueId("module", code);

      transform(ast, options);

      assert.strictEqual(
        prettyPrint(compile(code, options).ast).code,
        prettyPrint(ast).code,
        "Transform mismatch for " + absPath
      );
    });
  }

  it("gives the same results as compile with babylon", () => {
    check({
      ast: true,
      parse: require("../lib/parsers/babylon.js").parse,
      reject: (relPath) => {
        return relPath === "export/extensions.js" ||
               relPath === "import/extensions.js";
      }
    });
  }).timeout(5000);

  it("gives the same results as compile with acorn", () => {
    check({
      ast: true,
      parse: require("../lib/parsers/acorn.js").parse
    });
  }).timeout(5000);
});
