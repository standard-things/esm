"use strict";

var utils = require("./utils.js");
var hasOwn = Object.prototype.hasOwnProperty;
var Visitor = require("./visitor.js");

function AssignmentVisitor() {
  Visitor.call(this);
}

module.exports = AssignmentVisitor;

const AVp = AssignmentVisitor.prototype =
  Object.create(Visitor.prototype);
AVp.constructor = AssignmentVisitor;

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
  this.visitChildren(path);

  var callee = path.getValue().callee;
  if (callee.type === "Identifier" &&
      callee.name === "eval") {
    this._wrap(path);
  }
};

AVp._assignmentHelper = function (path, childName) {
  this.visitChildren(path);

  var child = path.getValue()[childName];
  var assignedNames = utils.getNamesFromPattern(child);
  var modifiesExport = assignedNames.some(function (name) {
    return hasOwn.call(this.exportedLocalNames, name);
  }, this);

  if (modifiesExport) {
    this._wrap(path);
  }
};

AVp._wrap = function (path) {
  var value = path.getValue();

  if (this.magicString) {
    this.magicString.prependRight(
      value.start,
      "module.runModuleSetters("
    ).appendLeft(value.end, ")");
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
      "arguments": [value]
    });
  }
};
