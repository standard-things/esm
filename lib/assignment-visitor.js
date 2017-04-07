"use strict";

const utils = require("./utils.js");
const Visitor = require("./visitor.js");

module.exports = class AssignmentVisitor extends Visitor {
  reset(rootPath, options) {
    this.exportedLocalNames = options.exportedLocalNames;
    this.magicString = options.magicString;
    this.modifyAST = !! options.modifyAST;
  }

  visitAssignmentExpression(path) {
    return this._assignmentHelper(path, "left");
  }

  visitCallExpression(path) {
    this.visitChildren(path);

    const callee = path.getValue().callee;
    if (callee.type === "Identifier" &&
        callee.name === "eval") {
      this._wrap(path);
    }
  }

  visitUpdateExpression(path) {
    return this._assignmentHelper(path, "argument");
  }

  _assignmentHelper(path, childName) {
    this.visitChildren(path);

    const child = path.getValue()[childName];
    const assignedNames = utils.getNamesFromPattern(child);
    const nameCount = assignedNames.length;

    // Wrap assignments to exported identifiers with `module.runModuleSetters`.
    for (let i = 0; i < nameCount; ++i) {
      if (this.exportedLocalNames[assignedNames[i]]) {
        this._wrap(path);
        break;
      }
    }
  }

  _wrap(path) {
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
        arguments: [value]
      });
    }
  }
};
