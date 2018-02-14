const columnInfoRegExp = /:1:\d+(?=\)?$)/gm
const runtimeRegExp = /\w+\u200d\.(\w+)(\.)/g
const traceRegExp = /(\n +at .+)+$/

const stdFilename = __non_webpack_module__.filename

function scrubStackTrace(stack) {
  if (typeof stack !== "string") {
    return ""
  }

  const match = traceRegExp.exec(stack)

  if (match === null) {
    return stack
  }

  const { index } = match
  const message = stack.slice(0, index)
  const trace = stack.slice(index)

  return message + trace
    .split("\n")
    .filter((line) => line.indexOf(stdFilename) === -1)
    .join("\n")
    .replace(columnInfoRegExp, ":1")
    .replace(runtimeRegExp, replaceRuntime)
}

function replaceRuntime(match, name, dot = "") {
  if (name === "i") {
    return "import" + dot
  }

  if (name === "r") {
    return "require" + dot
  }

  return ""
}

export default scrubStackTrace
