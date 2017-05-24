"use strict";

const getOption = require("./options.js").get;

const AV = require("./assignment-visitor.js");
const FastPath = require("./fast-path.js");
const IEV = require("./import-export-visitor.js");

const assignmentVisitor = new AV;
const importExportVisitor = new IEV;

function transform(ast, options) {
  options = Object.assign(Object.create(null), options);
  options.modifyAST = true;

  const code = null;

  const result = {
    ast,
    code,
    identical: true,
    sourceType: "script"
  };

  const rootPath = new FastPath(ast);
  importExportVisitor.visit(rootPath, code, options);

  if (importExportVisitor.madeChanges) {
    assignmentVisitor.visit(rootPath, {
      exportedLocalNames: importExportVisitor.exportedLocalNames,
      modifyAST: true
    });

    importExportVisitor.finalizeHoisting();
    result.identical = false;
  }

  if (! result.identical || getOption(options, "sourceType") !== "unambiguous") {
    result.sourceType = "module";
  }

  return result;
}

module.exports = transform;
