"use strict";

const hasOwn = Object.prototype.hasOwnProperty;
const assert = require("assert");
const FastPath = require("./fast-path.js");
const utils = require("./utils.js");
const shebangRegExp = /^#!.*/;
const importExportRegExp = /\b(?:im|ex)port\b/;
const getOption = require("./options.js").get;

function compile(code, options) {
  const parse = getOption(options, "parse");
  code = code.replace(shebangRegExp, "");

  if (! importExportRegExp.test(code)) {
    options.identical = true;

    const result = { code };

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
    magicString: magicString,
    exportedLocalNames: importExportVisitor.exportedLocalNames,
    modifyAST: importExportVisitor.modifyAST
  });

  importExportVisitor.finalizeHoisting();

  const result = {
    code: magicString.toString()
  };

  if (importExportVisitor.modifyAST) {
    // If the importExportVisitor modified the AST because options.ast was
    // truthy, then include it in the result.
    result.ast = ast;
  }

  return result;
}

exports.compile = compile;

function transform(ast, options) {
  const rootPath = FastPath.from(ast);
  const importExportOptions = Object.assign({}, options);

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
}

exports.transform = transform;

const IEV = require("./import-export-visitor.js");
const importExportVisitor = new IEV;

const AV = require("./assignment-visitor.js");
const assignmentVisitor = new AV;
