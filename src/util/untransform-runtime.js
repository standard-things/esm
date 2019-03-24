import shared from "../shared.js"

function init() {
  const evalCallExpRegExp = /\(eval===(\w+\u200D)\.v\?\1\.c:\1\.k\)/g
  const indirectEvalRegExp = /\(eval===(\w+\u200D)\.v\?\1\.e:eval\)/g
  const runtimeRegExp = /\w+\u200D\.(\w+)(\.)?/g

  function untransformRuntime(string) {
    if (typeof string !== "string") {
      return ""
    }

    return string
      .replace(evalCallExpRegExp, replaceEvalCallExp)
      .replace(indirectEvalRegExp, replaceIndirectEval)
      .replace(runtimeRegExp, replaceRuntime)
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

  return untransformRuntime
}

export default shared.inited
  ? shared.module.utilUntransformRuntime
  : shared.module.utilUntransformRuntime = init()
