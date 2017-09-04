import decorateStackTrace from "./decorate-stack-trace.js"
import isError from "../util/is-error.js"
import isParseError from "../util/is-parse-error.js"
import setGetter from "../util/set-getter.js"
import setProperty from "../util/set-property.js"
import setSetter from "../util/set-setter.js"

const messageRegExp = /^(.+?: .+?) \((\d+):(\d+)\)$/m
const removeArrowRegExp = /^.+\n *^$/m
const removeLineInfoRegExp = /:1:\d+(\)?)$/gm

function maskStackTrace(error, sourceCode) {
  if (! isError(error)) {
    return error
  }

  decorateStackTrace(error)
  const stack = error.stack

  // Defer any file read operations until `error.stack` is accessed. Ideally,
  // we'd wrap `error` in a proxy to defer the initial `error.stack` access.
  // However, `Error.captureStackTrace()` will throw when receiving a proxy
  // wrapped error object.
  setGetter(error, "stack", () => {
    return error.stack = isParseError(error)
      ? maskParserStack(stack, sourceCode, error.filename)
      : maskStack(stack)
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
  stack = scrubStack(stack)
  const parts = messageRegExp.exec(stack)

  if (parts === null) {
    // Exit early if already formatted.
    return stack
  }

  const desc = parts[1]
  const lineNum = +parts[2]
  const column = +parts[3]
  const spliceArgs = [0, 1]

  if (typeof filePath === "string") {
    spliceArgs.push(filePath + ":" + lineNum)
  }

  if (typeof sourceCode === "string") {
    spliceArgs.push(
      sourceCode.split("\n")[lineNum - 1] || "",
      " ".repeat(column) + "^",
      ""
    )
  }

  spliceArgs.push(desc)

  const stackLines = stack.split("\n")
  stackLines.splice(...spliceArgs)
  return stackLines.join("\n")
}

function maskStack(stack) {
  stack = scrubStack(stack)
  return stack.includes("\u200d") ? removeArrow(stack) : stack
}

function removeArrow(stack) {
  return stack.replace(removeArrowRegExp, "")
}

function scrubStack(stack) {
  return stack
    .split("\n")
    .filter((line) => ! line.includes(__non_webpack_filename__))
    .join("\n")
    .replace(removeLineInfoRegExp, "$1")
}

export default maskStackTrace
