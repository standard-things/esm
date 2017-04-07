"use strict";

const assert = require("assert");
const FastPath = require("./fast-path.js");
const getOption = require("./options.js").get;
const utils = require("./utils.js");

const IEV = require("./import-export-visitor.js");
const importExportVisitor = new IEV;

const AV = require("./assignment-visitor.js");
const assignmentVisitor = new AV;

const hasOwn = Object.prototype.hasOwnProperty;
const shebangRegExp = /^#!.*/;
const importExportRegExp = /\b(?:im|ex)port\b/;

exports.compile = function (code, options) {
  const parse = getOption(options, "parse");
  code = code.replace(shebangRegExp, "");

  const result = { ast: null, code };

  if (! getOption(options, "force") &&  ! importExportRegExp.test(code)) {

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

  assignmentVisitor.visit(rootPath, {
    exportedLocalNames: importExportVisitor.exportedLocalNames,
    magicString: magicString,
    modifyAST: importExportVisitor.modifyAST
  });

  importExportVisitor.finalizeHoisting();

  if (importExportVisitor.modifyAST) {
    // If the importExportVisitor modified the AST because options.ast was
    // truthy, then include it in the result.
    result.ast = ast;
  }

  result.code = magicString.toString();

  return result;
};

exports.transform = function (ast, options) {
  const importExportOptions = Object.assign({}, options);
  const rootPath = FastPath.from(ast);

  // Essential so that the AST will be modified.
  importExportOptions.ast = true;

  importExportVisitor.visit(
    rootPath,
    null, // No code to modify.
    importExportOptions
  );

  assignmentVisitor.visit(rootPath, {
    exportedLocalNames: importExportVisitor.exportedLocalNames,
    modifyAST: true
  });

  importExportVisitor.finalizeHoisting();

  return ast;
};
