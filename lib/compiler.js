var hasOwn = Object.prototype.hasOwnProperty;
var assert = require("assert");
var types = require("ast-types/fork")([
  require("ast-types/def/esprima"),
  require("ast-types/def/babel6-core")
]);

var utils = require("./utils.js");
var shebangRegExp = /^#!.*/;
var importExportRegExp = /\b(?:im|ex)port\b/;

exports.parse = require("./parsers/default.js").parse;

function compile(code, options) {
  var parse = utils.getOption(options, "parse");
  code = code.replace(shebangRegExp, "");

  if (! importExportRegExp.test(code)) {
    options.identical = true;

    var result = { code: code };

    if (utils.getOption(options, "ast")) {
      // To take full advantage of identity checking, you should probably
      // pass the { ast: false } option to the compile function.
      result.ast = parse(code);
    }

    return result;
  }

  var ast = parse(code);
  var rootPath = new types.NodePath(ast);

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
  var rootPath = new types.NodePath(ast);
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
var importExportVisitor =
  new types.PathVisitor.fromMethodsObject(IEV.prototype);

var assignmentVisitor = new types.PathVisitor.fromMethodsObject({
  reset: function (rootPath, options) {
    this.magicString = options.magicString;
    this.exportedLocalNames = options.exportedLocalNames;
    this.modifyAST = !! options.modifyAST;
  },

  visitAssignmentExpression: function (path) {
    return this._assignmentHelper(path, "left");
  },

  visitUpdateExpression: function (path) {
    return this._assignmentHelper(path, "argument");
  },

  visitCallExpression: function (path) {
    this.traverse(path);
    var callee = path.value.callee;
    if (callee.type === "Identifier" &&
        callee.name === "eval") {
      this._wrap(path);
    }
  },

  _assignmentHelper: function (path, childName) {
    this.traverse(path);

    var child = path.value[childName];
    var assignedNames = utils.getNamesFromPattern(child);
    var modifiesExport = assignedNames.some(function (name) {
      return hasOwn.call(this.exportedLocalNames, name);
    }, this);

    if (modifiesExport) {
      this._wrap(path);
    }
  },

  _wrap: function (path) {
    if (this.magicString) {
      this.magicString.prependRight(
        path.value.start,
        "module.runModuleSetters("
      ).appendLeft(path.value.end, ")");
    }

    if (this.modifyAST) {
      path.replace({
        type: "CallExpression",
        callee: {
          type: "MemberExpression",
          object: {
            type: "Identifier",
            name: "module"
          },
          property: {
            type: "Identifier",
            name: "runModuleSetters"
          }
        },
        "arguments": [path.value]
      });
    }
  }
});
