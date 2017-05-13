"use strict";

const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const getOption = require("./options.js").get;

const AV = require("./assignment-visitor.js");
const FastPath = require("./fast-path.js");
const IEV = require("./import-export-visitor.js");

const assignmentVisitor = new AV;
const importExportVisitor = new IEV;

const codeOfPound = "#".charCodeAt(0);
const shebangRegExp = /^#!.*/;

// Matches any import or export identifier as long as it's not preceded by
// a `.` character (to avoid matching module.export, for example). Because
// Reify replaces all import and export declarations with module.import
// and module.export calls, this logic should prevent the compiler from
// ever having to recompile code it has already compiled.
const importExportRegExp = /(?:^|[^.])\b(?:im|ex)port\b/;

exports.compile = function (code, options) {
  options = Object.assign(Object.create(null), options);

  const parse = getOption(options, "parse");
  const sourceType = getOption(options, "sourceType");

  if (code.charCodeAt(0) === codeOfPound) {
    code = code.replace(shebangRegExp, "");
  }

  const ast = parse(code);

  const result = {
    code,
    ast: null,
    identical: false
  };

  if (getOption(options, "ast")) {
    result.ast = ast;
  }

  if (sourceType === "script" ||
      (sourceType === "unambiguous" && ! importExportRegExp.test(code))) {
    // Let the caller know the result is no different from the input.
    result.identical = true;
    return result;
  }

  options.moduleAlias = options.moduleAlias ||
    makeUniqueId("module", code);

  const rootPath = new FastPath(ast);
  importExportVisitor.visit(rootPath, code, options);
  result.identical = ! importExportVisitor.madeChanges;

  const magicString = importExportVisitor.magicString;

  if (! result.identical || sourceType === "module") {
    assignmentVisitor.visit(rootPath, {
      exportedLocalNames: importExportVisitor.exportedLocalNames,
      magicString: magicString,
      modifyAST: importExportVisitor.modifyAST
    });

    importExportVisitor.finalizeHoisting();

    if (getOption(options, "wrapWithRun")) {
      result.code = "module.run(function(){" +
        magicString.toString() + "//*/\n});";

      return result;
    }
  }

  result.code = magicString.toString();

  return result;
};

exports.transform = function (ast, options) {
  return dynRequire("./transform.js")(ast, options);
};

function makeUniqueId(prefix, source) {
  const scanRegExp = new RegExp("\\b" + prefix + "(\\d*)\\b", "g");
  let match, max = -1;

  while ((match = scanRegExp.exec(source))) {
    max = Math.max(max, +(match[1] || 0));
  }

  if (max >= 0) {
    return prefix + (max + 1);
  }

  return prefix;
}

exports.makeUniqueId = makeUniqueId;
