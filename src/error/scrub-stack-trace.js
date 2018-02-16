import GenericArray from "../generic/array.js"
import GenericRegExp from "../generic/regexp.js"
import GenericString from "../generic/string.js"

const columnInfoRegExp = /:1:\d+(?=\)?$)/gm
const runtimeRegExp = /\w+\u200d\.(\w+)(\.)?/g
const traceRegExp = /(\n +at .+)+$/

const stdFilename = __non_webpack_module__.filename

function scrubStackTrace(stack) {
  if (typeof stack !== "string") {
    return ""
  }

  const match = GenericRegExp.exec(traceRegExp, stack)

  if (match === null) {
    return stack
  }

  const { index } = match
  const message = GenericString.slice(stack, 0, index)

  let trace = GenericString.slice(stack, index)
  const lines = GenericString.split(trace, "\n")

  const filtered = GenericArray.filter(lines, (line) => {
    return GenericString.indexOf(line, stdFilename) === -1
  })

  trace = GenericArray.join(filtered, "\n")
  trace = GenericString.replace(trace, columnInfoRegExp, ":1")
  trace = GenericString.replace(trace, runtimeRegExp, replaceRuntime)

  return message + trace
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
