import shared from "../shared.js"

function init() {
  function isBindingIdentifier(node, parent) {
    if (node.type !== "Identifier") {
      return false
    }

    if (parent === void 0) {
      return true
    }

    const { type } = parent

    if (type === "Property") {
      return parent.computed ||
             parent.shorthand
    }

    if (((type === "AssignmentExpression" ||
          type === "AssignmentPattern") &&
         parent.left === node) ||
        (type === "UpdateExpression" &&
         parent.argument === node) ||
        type === "BreakStatement" ||
        type === "ContinueStatement" ||
        type === "ImportDefaultSpecifier" ||
        type === "ImportNamespaceSpecifier" ||
        type === "ImportSpecifier" ||
        type === "LabeledStatement") {
      return false
    }

    return true
  }

  return isBindingIdentifier
}

export default shared.inited
  ? shared.module.parseIsBindingIdentifier
  : shared.module.parseIsBindingIdentifier = init()
