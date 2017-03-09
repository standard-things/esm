import assert from "assert";
import { join } from "path";
import {
  readdirSync,
  readFileSync,
  statSync,
} from "fs";
import { compile, transform } from "../lib/compiler.js";
import { prettyPrint } from "recast";

var jsFiles = Object.create(null);

function walk(dir) {
  readdirSync(dir).forEach(function (item) {
    var absPath = join(dir, item);
    var stat = statSync(absPath);
    if (stat.isDirectory()) {
      walk(absPath);
    } else if (item.endsWith(".js") &&
               stat.isFile()) {
      jsFiles[absPath] = readFileSync(absPath, "utf8");
    }
  });
}

walk(__dirname);

describe("compiler.transform", function () {
  function check(options) {
    Object.keys(jsFiles).forEach(function (absPath) {
      var code = jsFiles[absPath];
      assert.strictEqual(
        prettyPrint(compile(code, options).ast).code,
        prettyPrint(transform(options.parse(code), options)).code,
        "Transform mismatch for " + absPath
      );
    });
  }

  it("gives the same results as compile with babylon", function () {
    check({
      ast: true,
      parse: require("../lib/parsers/babylon.js").parse
    });
  });

  it("gives the same results as compile with acorn", function () {
    check({
      ast: true,
      parse: require("../lib/parsers/acorn.js").parse
    });
  });
});
