"use strict";

const utils = require("./utils.js");
const hasOwn = Object.prototype.hasOwnProperty;
const Visitor = require("./visitor.js");

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

  const callee = path.getValue().callee;
  if (callee.type === "Identifier" &&
      callee.name === "eval") {
    this._wrap(path);
  }
};

AVp._assignmentHelper = function (path, childName) {
  this.visitChildren(path);

  const child = path.getValue()[childName];
  const assignedNames = utils.getNamesFromPattern(child);
  const nameCount = assignedNames.length;

  // Wrap assignments to exported identifiers with `module.runModuleSetters`.
  for (let i = 0; i < nameCount; ++i) {
    if (hasOwn.call(this.exportedLocalNames, assignedNames[i])) {
      this._wrap(path);
      break;
    }
  }
};

AVp._wrap = function (path) {
  const value = path.getValue();

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
