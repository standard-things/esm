import assert from "assert";
import { relative } from "path";
import { transformFromAst } from "babel-core";
import { files } from "./all-files.js";
import { parse } from "../lib/parsers/babylon.js";
import reifyPlugin from "babel-plugin-transform-es2015-modules-reify";
import es2015Preset from "babel-preset-es2015";

const filesToTest = Object.create(null);

Object.keys(files).forEach((absPath) => {
  const code = files[absPath];
  const relPath = relative(__dirname, absPath);

  // These files fail to transform with es2015 preset due to problems
  // unrelated to the functionality of the Reify Babel plugin.
  if (relPath === "export/some.js"  ||
      relPath === "export-tests.js" ||
      relPath === "import-tests.js" ||
      relPath === "setter-tests.js") {
    return;
  }

  // Files without import or export tokens don't need to be tested.
  if (! /\b(?:im|ex)port\b/.test(code)) {
    return;
  }

  filesToTest[relPath] = code;
});

describe("babel-plugin-transform-es2015-modules-reify", () => {
  function check(code, options) {
    const ast = parse(code);
    delete ast.tokens;
    const result = transformFromAst(ast, code, options);
    assert.ok(/\bmodule\.(?:importSync|export)\b/.test(result.code));
    return result;
  }

  Object.keys(filesToTest).forEach((relPath) => {
    const code = filesToTest[relPath];
    const plugins = [[reifyPlugin, {
      generateLetDeclarations: true
    }]];

    it(`compiles ${relPath}`, () => {
      check(code, { plugins });
    });

    it(`compiles ${relPath} with es2015`, () => {
      check(code, {
        plugins,
        presets: [es2015Preset]
      });
    });
  });
});
