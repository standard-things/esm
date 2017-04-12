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
  const parse = getOption(options, "parse");
  code = code.replace(shebangRegExp, "");

  const result = {
    code,
    ast: null,
    identical: false
  };

  if (! getOption(options, "force") &&
      ! importExportRegExp.test(code)) {
    // Let the caller know the result is no different from the input.
    result.identical = true;

    if (getOption(options, "ast")) {
      // To take full advantage of identity checking, you should probably
      // pass the { ast: false } option to the compile function.
      result.ast = parse(code);
    }

    return result;
  }

  const ast = parse(code);
  const rootPath = FastPath.from(ast);

  importExportVisitor.visit(rootPath, code, options);

  const magicString = importExportVisitor.magicString;

  if (importExportVisitor.madeChanges) {
    assignmentVisitor.visit(rootPath, {
      exportedLocalNames: importExportVisitor.exportedLocalNames,
      magicString: magicString,
      modifyAST: importExportVisitor.modifyAST
    });

    importExportVisitor.finalizeHoisting();

  } else {
    // Let the caller know the result is no different from the input.
    result.identical = true;
  }

  if (importExportVisitor.modifyAST) {
    // If the importExportVisitor modified the AST because options.ast was
    // truthy, then include it in the result.
    result.ast = ast;
  }

  result.code = magicString.toString();

  return result;
};

exports.transform = function (ast, options) {
  return dynRequire("./transform.js")(ast, options);
};
