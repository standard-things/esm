"use strict";

const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;

const FastPath = require("./fast-path.js");
const getOption = require("./options.js").get;

const IEV = require("./import-export-visitor.js");
const importExportVisitor = new IEV;

const AV = require("./assignment-visitor.js");
const assignmentVisitor = new AV;

const shebangRegExp = /^#!.*/;
const importExportRegExp = /\b(?:im|ex)port\b/;

exports.compile = function (code, options) {
  code = code.replace(shebangRegExp, "");
  options = Object.assign(Object.create(null), options);

  const parse = getOption(options, "parse");
  const ast = parse(code);

  const result = {
    code,
    ast: null,
    identical: false
  };

  if (getOption(options, "ast")) {
    result.ast = ast;
  }

  if (! getOption(options, "force") &&
      ! importExportRegExp.test(code)) {
    // Let the caller know the result is no different from the input.
    result.identical = true;
    return result;
  }

  const rootPath = FastPath.from(ast);

  importExportVisitor.visit(rootPath, code, options);
  result.identical = ! importExportVisitor.madeChanges;

  const magicString = importExportVisitor.magicString;

  if (! result.identical) {
    assignmentVisitor.visit(rootPath, {
      exportedLocalNames: importExportVisitor.exportedLocalNames,
      magicString: magicString,
      modifyAST: importExportVisitor.modifyAST
    });

    importExportVisitor.finalizeHoisting();
  }

  result.code = magicString.toString();
  return result;
};

exports.transform = function (ast, options) {
  return dynRequire("./transform.js")(ast, options);
};
