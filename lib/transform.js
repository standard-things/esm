"use strict";

const AV = require("./assignment-visitor.js");
const FastPath = require("./fast-path.js");
const IEV = require("./import-export-visitor.js");

const assignmentVisitor = new AV;
const importExportVisitor = new IEV;

function transform(ast, options) {
  options = Object.assign(Object.create(null), options);
  options.modifyAST = true;

  const rootPath = new FastPath(ast);

  importExportVisitor.visit(
    rootPath,
    null, // No code to modify.
    options
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
}

module.exports = transform;
