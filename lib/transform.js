"use strict";

const AV = require("./assignment-visitor.js");
const FastPath = require("./fast-path.js");
const IEV = require("./import-export-visitor.js");

const assignmentVisitor = new AV;
const importExportVisitor = new IEV;

module.exports = function (ast, options) {
  const importExportOptions = Object.assign(Object.create(null), options);
  const rootPath = new FastPath(ast);

  // Essential so that the AST will be modified.
  importExportOptions.ast = true;

  importExportVisitor.visit(
    rootPath,
    null, // No code to modify.
    importExportOptions
  );

  const result = { ast, identical: false };

  if (importExportVisitor.madeChanges) {
    assignmentVisitor.visit(rootPath, {
      exportedLocalNames: importExportVisitor.exportedLocalNames,
      modifyAST: true
    });

    importExportVisitor.finalizeHoisting();

  } else {
    // Let the caller know the result is no different from the input.
    result.identical = true;
  }

  return result;
};
