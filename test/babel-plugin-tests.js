import assert from "assert";
import { relative } from "path";
import { transformFromAst } from "babel-core";
import { files } from "./all-files.js";
import { parse } from "../lib/parsers/babylon.js";

var filesToTest = Object.create(null);

Object.keys(files).forEach(function (absPath) {
  var code = files[absPath];
  var relPath = relative(__dirname, absPath);

  // These files fail to transform with es2015 preset due to problems
  // unrelated to the functionality of the Reify Babel plugin.
  if (relPath === "export-tests.js" ||
      relPath === "setter-tests.js" ||
      relPath === "export-some.js") {
    return;
  }

  // Files without import or export tokens don't need to be tested.
  if (! /\b(import|export)\b/.test(code)) {
    return;
  }

  filesToTest[relPath] = code;
});

describe("babel-plugin-transform-es2015-modules-reify", function () {
  function check(code, options) {
    var ast = parse(code);
    delete ast.tokens;
    var result = transformFromAst(ast, code, options);
    assert.ok(/\bmodule\.(import|export)\b/.test(result.code));
    return result;
  }

  Object.keys(filesToTest).forEach(function (relPath) {
    var code = filesToTest[relPath];

    it("compiles " + relPath, function () {
      check(code, {
        plugins: ["transform-es2015-modules-reify"]
      });
    });

    it("compiles " + relPath + " with es2015", function () {
      check(code, {
        plugins: ["transform-es2015-modules-reify"],
        presets: ["es2015"]
      });
    });
  });
});
