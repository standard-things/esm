import shared from "../shared.js"

function init() {
  const evalExpRegExp = /\(eval===(\w+\u200D)\.v\?$1\.e:eval\)/g
  const runtimeRegExp = /\w+\u200D\.(\w+)(\.)?/g

  function untransformRuntime(string) {
    if (typeof string !== "string") {
      return ""
    }

    return string
      .replace(evalExpRegExp, replaceEvalExp)
      .replace(runtimeRegExp, replaceRuntime)
  }

  function replaceEvalExp() {
    return "eval"
  }

  function replaceRuntime(match, name, dot = "") {
    if (name === "e") {
      return "eval" + dot
    }

    if (name === "i") {
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
