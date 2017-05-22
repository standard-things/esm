"use strict";

const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const getOption = require("./options.js").get;

const AV = require("./assignment-visitor.js");
const FastPath = require("./fast-path.js");
const IEV = require("./import-export-visitor.js");

const assignmentVisitor = new AV;
const importExportVisitor = new IEV;

const codeOfPound = "#".charCodeAt(0);

// Matches any import or export identifier as long as it's not preceded by
// a `.` character (to avoid matching module.export, for example). Because
// Reify replaces all import and export declarations with module.import
// and module.export calls, this logic should prevent the compiler from
// ever having to recompile code it has already compiled.
const importExportRegExp = /(?:^|[^.])\b(?:im|ex)port\b/;
const shebangRegExp = /^#!.*/;

function compile(code, options) {
  options = Object.assign(Object.create(null), options);

  if (code.charCodeAt(0) === codeOfPound) {
    code = code.replace(shebangRegExp, "");
  }

  const parse = getOption(options, "parse");
  const ast = parse(code);
  const result = {
    ast,
    code,
    identical: false
  };

  const sourceType = getOption(options, "sourceType");

  if (sourceType === "script" ||
      (sourceType === "unambiguous" && ! importExportRegExp.test(code))) {
    // Let the caller know the result is no different from the input.
    result.identical = true;
    return result;
  }

  const rootPath = new FastPath(ast);
  options.moduleAlias = makeUniqueId(getOption(options, "moduleAlias"), code);
  importExportVisitor.visit(rootPath, code, options);

  const magicString = importExportVisitor.magicString;
  result.identical = ! importExportVisitor.madeChanges;

  if (! result.identical || sourceType === "module") {
    assignmentVisitor.visit(rootPath, {
      exportedLocalNames: importExportVisitor.exportedLocalNames,
      magicString: magicString,
      modifyAST: importExportVisitor.modifyAST,
      moduleAlias: importExportVisitor.moduleAlias
    });

    importExportVisitor.finalizeHoisting();

    if (! getOption(options, "repl")) {
      result.code =
        "module.run(function(){" +
        magicString.toString() +
        "\n})";

      return result;
    }
  }

  result.code = magicString.toString();

  return result;
}

exports.compile = compile;

function makeUniqueId(id, code) {
  let match;
  let n = -1;
  const scan = new RegExp("\\b" + id + "(\\d*)\\b", "g");

  while ((match = scan.exec(code))) {
    n = Math.max(n, +(match[1] || 0));
  }

  return id + (n > -1 ?  ++n : "");
}

exports.makeUniqueId = makeUniqueId;

function transform(ast, options) {
  return dynRequire("./transform.js")(ast, options);
}

exports.transform = transform;
