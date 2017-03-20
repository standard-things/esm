"use strict";

var utils = require("./utils.js");
var hasOwn = Object.prototype.hasOwnProperty;

function AssignmentVisitor() {}

module.exports = AssignmentVisitor;
var AVp = AssignmentVisitor.prototype;

AVp.reset = function (rootPath, options) {
  this.magicString = options.magicString;
  this.exportedLocalNames = options.exportedLocalNames;
  this.modifyAST = !! options.modifyAST;
};

AVp.visitAssignmentExpression = function (path) {
  return this._assignmentHelper(path, "left");
};

AVp.visitUpdateExpression = function (path) {
  return this._assignmentHelper(path, "argument");
};

AVp.visitCallExpression = function (path) {
  this.traverse(path);
  var callee = path.value.callee;
  if (callee.type === "Identifier" &&
      callee.name === "eval") {
    this._wrap(path);
  }
};

AVp._assignmentHelper = function (path, childName) {
  this.traverse(path);

  var child = path.value[childName];
  var assignedNames = utils.getNamesFromPattern(child);
  var modifiesExport = assignedNames.some(function (name) {
    return hasOwn.call(this.exportedLocalNames, name);
  }, this);

  if (modifiesExport) {
    this._wrap(path);
  }
};

AVp._wrap = function (path) {
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
};
