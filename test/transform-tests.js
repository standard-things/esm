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
    options = Object.assign(Object.create(null), options);
    const reject = options.reject;
    delete options.reject;

    Object.keys(files).forEach(function (absPath) {
      if (typeof reject === "function" &&
          reject(relative(__dirname, absPath))) {
        return;
      }

      const code = files[absPath];
      options.moduleAlias = makeUniqueId("module", code);

      const ast = options.parse(code);
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
      modifyAST: true,
      parse: require("../lib/parser/babylon.js").parse,
      reject: (relPath) => {
        return relPath === "export/extensions.js" ||
               relPath === "import/extensions.js" ||
               relPath.startsWith("output/export-multi-namespace/");
      }
    });
  }).timeout(5000);

  it("gives the same results as compile with acorn", () => {
    check({
      modifyAST: true,
      parse: require("../lib/parser/acorn.js").parse
    });
  }).timeout(5000);
});
