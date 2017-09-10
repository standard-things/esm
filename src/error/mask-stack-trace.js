import decorateStackTrace from "./decorate-stack-trace.js"
import isError from "../util/is-error.js"
import isParseError from "../util/is-parse-error.js"
import setGetter from "../util/set-getter.js"
import setProperty from "../util/set-property.js"
import setSetter from "../util/set-setter.js"

const engineMessageRegExp = /^.+?:(\d+)(?=\n)/
const parserMessageRegExp = /^(.+?: .+?) \((\d+):(\d+)\)(?=\n)/

const removeLineInfoRegExp = /:1:\d+(\)?)$/gm
const replaceArrowRegExp = /^.+\n *\^+\n/m

function maskStackTrace(error, sourceCode, filePath) {
  if (! isError(error)) {
    return error
  }

  decorateStackTrace(error)
  let stack = error.stack

  // Defer any file read operations until `error.stack` is accessed. Ideally,
  // we'd wrap `error` in a proxy to defer the initial `error.stack` access.
  // However, `Error.captureStackTrace()` will throw when receiving a proxy
  // wrapped error object.
  setGetter(error, "stack", () => {
    stack = scrubStack(stack)

    if (isParseError(error)) {
      return error.stack = maskParserStack(stack, sourceCode, filePath)
    }

    return error.stack = stack.includes("\u200d")
      ? maskNodeStack(stack, sourceCode, filePath)
      : stack
  })

  setSetter(error, "stack", (value) => {
    setProperty(error, "stack", { enumerable: false, value })
  })

  return error
}

// Transform parser stack lines from:
// SyntaxError: <description> (<line>:<column>)
//   ...
// to:
// path/to/file.js:<line>
// <line of code, from the original source, where the error occurred>
// <column indicator arrow>
//
// SyntaxError: <description>
//   ...
function maskParserStack(stack, sourceCode, filePath) {
  const parts = parserMessageRegExp.exec(stack)

  if (parts === null) {
    return stack
  }

  const desc = parts[1]
  const lineNum = +parts[2]
  const column = +parts[3]
  const spliceArgs = [0, 1]
  const stackLines = stack.split("\n")

  if (typeof filePath === "string") {
    spliceArgs.push(filePath + ":" + lineNum)
  }

  if (typeof sourceCode === "function") {
    sourceCode = sourceCode(filePath)
  }

  if (typeof sourceCode === "string") {
    const lines = sourceCode.split("\n")
    const line = lines[lineNum - 1]

    if (line) {
      spliceArgs.push(line, " ".repeat(column) + "^", "")
    }
  }

  spliceArgs.push(desc)
  stackLines.splice(...spliceArgs)
  return stackLines.join("\n")
}

function maskNodeStack(stack, sourceCode, filePath) {
  const parts = engineMessageRegExp.exec(stack)

  if (parts === null) {
    return stack
  }

  return stack.replace(replaceArrowRegExp, () => {
    if (typeof sourceCode === "function") {
      sourceCode = sourceCode(filePath)
    }

    if (typeof sourceCode !== "string") {
      return ""
    }

    const lineNum = +parts[1]
    const lines = sourceCode.split("\n")
    const line = lines[lineNum - 1]
    return line ? (line + "\n") : ""
  })
}

function scrubStack(stack) {
  return stack
    .split("\n")
    .filter((line) => ! line.includes(__non_webpack_module__.filename))
    .join("\n")
    .replace(removeLineInfoRegExp, ":1$1")
}

export default maskStackTrace
