var hasOwn = Object.prototype.hasOwnProperty;
var assert = require("assert");
var FastPath = require("./fast-path.js");
var utils = require("./utils.js");
var shebangRegExp = /^#!.*/;
var importExportRegExp = /\b(?:im|ex)port\b/;
var getOption = require("./options.js").get;

exports.parse = require("./parsers/default.js").parse;

function compile(code, options) {
  var parse = getOption(options, "parse");
  code = code.replace(shebangRegExp, "");

  if (! importExportRegExp.test(code)) {
    options.identical = true;

    var result = { code: code };

    if (getOption(options, "ast")) {
      // To take full advantage of identity checking, you should probably
      // pass the { ast: false } option to the compile function.
      result.ast = parse(code);
    }

    return result;
  }

  var ast = parse(code);
  var rootPath = FastPath.from(ast);

  importExportVisitor.visit(rootPath, code, options);

  var magicString = importExportVisitor.magicString;

  assignmentVisitor.visit(rootPath, {
    magicString: magicString,
    exportedLocalNames: importExportVisitor.exportedLocalNames,
    modifyAST: importExportVisitor.modifyAST
  });

  importExportVisitor.finalizeHoisting();

  var result = {
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
  var rootPath = FastPath.from(ast);
  var importExportOptions = Object.assign({}, options);

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

var IEV = require("./import-export-visitor.js");
var importExportVisitor = new IEV;

var AV = require("./assignment-visitor.js");
var assignmentVisitor = new AV;
