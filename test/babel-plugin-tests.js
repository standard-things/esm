import assert from "assert";
import { relative } from "path";
import { transformFromAst } from "babel-core";
import { files } from "./all-files.js";
import { parse } from "../lib/parsers/babylon.js";
import reifyPlugin from "babel-plugin-transform-es2015-modules-reify";
import es2015Preset from "babel-preset-es2015";

var filesToTest = Object.create(null);

Object.keys(files).forEach(function (absPath) {
  var code = files[absPath];
  var relPath = relative(__dirname, absPath);

  // These files fail to transform with es2015 preset due to problems
  // unrelated to the functionality of the Reify Babel plugin.
  if (relPath === "import-tests.js" ||
      relPath === "export-tests.js" ||
      relPath === "setter-tests.js" ||
      relPath === "export-some.js") {
    return;
  }

  // Files without import or export tokens don't need to be tested.
  if (! /\b(?:im|ex)port\b/.test(code)) {
    return;
  }

  filesToTest[relPath] = code;
});

describe("babel-plugin-transform-es2015-modules-reify", function () {
  function check(code, options) {
    var ast = parse(code);
    delete ast.tokens;
    var result = transformFromAst(ast, code, options);
    assert.ok(/\bmodule\.(?:importSync|export)\b/.test(result.code));
    return result;
  }

  Object.keys(filesToTest).forEach(function (relPath) {
    var code = filesToTest[relPath];

    it("compiles " + relPath, function () {
      check(code, {
        plugins: [reifyPlugin]
      });
    });

    it("compiles " + relPath + " with es2015", function () {
      check(code, {
        plugins: [reifyPlugin],
        presets: [es2015Preset]
      });
    });
  });
});
