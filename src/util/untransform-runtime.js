import shared from "../shared.js"

function init() {
  const assertImportedBindingRegExp = /\w+\u200D\.a\("(.+?)",\1\)/g
  const assertUndeclaredRegExp = /\w+\u200D\.t\("(.+?)"\)/g
  const evalCallExpRegExp = /\(eval===(\w+\u200D)\.v\?\1\.c:\1\.k\)/g
  const indirectEvalRegExp = /\(eval===(\w+\u200D)\.v\?\1\.e:eval\)/g
  const runtimeRegExp = /\w+\u200D\.(\w+)(\.)?/g
  const throwConstAssignmentRegExp = /\w+\u200D\.b\("(.+?)","(.+?)",?/g

  function untransformRuntime(string) {
    if (typeof string !== "string") {
      return ""
    }

    return string
      .replace(assertImportedBindingRegExp, replaceAssert)
      .replace(assertUndeclaredRegExp, replaceAssert)
      .replace(evalCallExpRegExp, replaceEvalCallExp)
      .replace(indirectEvalRegExp, replaceIndirectEval)
      .replace(throwConstAssignmentRegExp, replaceThrowConstAssignment)
      .replace(runtimeRegExp, replaceRuntime)
  }

  function replaceAssert(match, name) {
    return name
  }

  function replaceEvalCallExp() {
    return ""
  }

  function replaceIndirectEval() {
    return "eval"
  }

  function replaceRuntime(match, name, dot = "") {
    if (name === "e") {
      return "eval" + dot
    }

    if (name === "_" ||
        name === "i") {
      return "import" + dot
    }

    if (name === "r") {
      return "require" + dot
    }

    return ""
  }

  function replaceThrowConstAssignment(match, left, operator) {
    return "(" + left + operator
  }

  return untransformRuntime
}

export default shared.inited
  ? shared.module.utilUntransformRuntime
  : shared.module.utilUntransformRuntime = init()
