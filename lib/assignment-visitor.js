"use strict";

const utils = require("./utils.js");
const Visitor = require("./visitor.js");

class AssignmentVisitor extends Visitor {
  reset(rootPath, options) {
    this.exportedLocalNames = options.exportedLocalNames;
    this.magicString = options.magicString;
    this.modifyAST = !! options.modifyAST;
    this.moduleAlias = options.moduleAlias;

    if (this.exportedLocalNames === void 0) {
      this.exportedLocalNames = Object.create(null);
    }

    if (this.magicString === void 0) {
      this.magicString = null;
    }
  }

  visitAssignmentExpression(path) {
    return assignmentHelper(this, path, "left");
  }

  visitCallExpression(path) {
    this.visitChildren(path);

    const callee = path.getValue().callee;
    if (callee.type === "Identifier" &&
        callee.name === "eval") {
      wrap(this, path);
    }
  }

  visitUpdateExpression(path) {
    return assignmentHelper(this, path, "argument");
  }
};

function assignmentHelper(visitor, path, childName) {
  visitor.visitChildren(path);

  const child = path.getValue()[childName];
  const assignedNames = utils.getNamesFromPattern(child);
  const nameCount = assignedNames.length;

  // Wrap assignments to exported identifiers with `module.runSetters`.
  for (let i = 0; i < nameCount; ++i) {
    if (visitor.exportedLocalNames[assignedNames[i]] === true) {
      wrap(visitor, path);
      break;
    }
  }
}

function wrap(visitor, path) {
  const value = path.getValue();

  if (visitor.magicString !== null) {
    visitor.magicString.prependRight(
      value.start,
      visitor.moduleAlias + ".runSetters("
    ).appendLeft(value.end, ")");
  }

  if (visitor.modifyAST) {
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
          name: "runSetters"
        }
      },
      arguments: [value]
    });
  }
}

module.exports = AssignmentVisitor;
