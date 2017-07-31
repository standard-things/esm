import binding from "../util/binding.js"
import isParseError from "../util/is-parse-error.js"
import setGetter from "../util/set-getter.js"
import setProperty from "../util/set-property.js"
import setSetter from "../util/set-setter.js"

const lineNumRegExp = /:(\d+)/
const columnNumRegExp = /:(\d+)(?=\)|$)/
const filePathRegExp = /(?:^ {4}at |\()(.*?)(?=:\d+:\d+\)?$)/
const parserMessageRegExp = /^(.+?: .+?) \((\d+):(\d+)\)$/
const splice = Array.prototype.splice

const internalDecorateErrorStack = binding.decorateErrorStack
const internalSetHiddenValue = binding.setHiddenValue

const useInternalDecorateErrorStack = typeof internalDecorateErrorStack === "function"
const useInternalSetHiddenValue = typeof internalSetHiddenValue === "function"

function maskStackTrace(error, sourceCode, compiledCode) {
  decorateStackTrace(error)
  const stack = error.stack

  // Defer any file read operations until the error.stack property is accessed.
  // Ideally, we'd wrap the error in a Proxy to defer even the initial error.stack
  // property access. However, Error.captureStackTrace() will throw when receiving
  // a proxy wrapped error.
  setGetter(error, "stack", () =>
    error.stack = resolveStack(error, stack, sourceCode, compiledCode)
  )

  setSetter(error, "stack", (value) => {
    setProperty(error, "stack", { enumerable: false, value })
  })

  return error
}

function decorateStackTrace(error) {
  if (useInternalSetHiddenValue) {
    if ("arrow_message_private_symbol" in binding) {
      internalSetHiddenValue(error, binding.arrow_message_private_symbol, "")
    } else {
      try {
        internalSetHiddenValue(error, "arrowMessage", "")
        internalSetHiddenValue(error, "node:arrowMessage", "")
      } catch (e) {}
    }

    if ("decorated_private_symbol" in binding) {
      internalSetHiddenValue(error, binding.decorated_private_symbol, true)
    } else {
      try {
        internalSetHiddenValue(error, "node:decorated", true)
      } catch (e) {}
    }
  }

  if (useInternalDecorateErrorStack) {
    internalDecorateErrorStack(error)
  }

  return error
}

// Fill in an incomplete stack from:
// SyntaxError: <description>
//     at <function name> (path/to/file.js:<line>:<column>)
//   ...
// to:
// path/to/file.js:<line>
// <line of code, from the compiled code, where the error occurred>
// <column indicator arrow>
//
// SyntaxError: <description>
//     at <function name> (<function location>)
//   ...
function fillStackLines(stackLines, sourceCode, compiledCode) {
  const stackFrame = stackLines[1]
  const locMatch = lineNumRegExp.exec(stackFrame)

  if (locMatch === null) {
    return
  }

  const column = +columnNumRegExp.exec(stackFrame)[1]
  const filePath = filePathRegExp.exec(stackFrame)[1]
  const lineNum = +locMatch[1]

  stackLines.unshift(
    filePath + ":" + lineNum,
    compiledCode.split("\n")[lineNum - 1],
    " ".repeat(column) + "^", ""
  )
}

// Transform parser stack lines from:
// SyntaxError: <description> (<line>:<column>) while processing file: path/to/file.js
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
  const stackLines = stack.split("\n")

  const parts = parserMessageRegExp.exec(stackLines[0])
  const desc = parts[1]
  const lineNum = parts[2]
  const column = parts[3]
  const spliceArgs = [0, 1]

  if (typeof filePath === "string") {
    spliceArgs.push(filePath + ":" + lineNum)
  }

  spliceArgs.push(
    sourceCode.split("\n")[lineNum - 1],
    " ".repeat(column) + "^",
    "", desc
  )

  splice.apply(stackLines, spliceArgs)
  return stackLines.join("\n")
}

function maskStack(stack, sourceCode, compiledCode) {
  stack = scrubStack(stack)
  const stackLines = stack.split("\n")

  if (! lineNumRegExp.test(stackLines[0]) &&
      compiledCode !== void 0) {
    fillStackLines(stackLines, sourceCode, compiledCode)
  }

  maskStackLines(stackLines, sourceCode)
  return stackLines.join("\n")
}

function maskStackLines(stackLines, sourceCode) {
  const locMatch = lineNumRegExp.exec(stackLines[0])

  if (locMatch === null) {
    return
  }

  const lineNum = +locMatch[1]
  const column = stackLines[2].indexOf("^")

  const lines = sourceCode.split("\n")
  const sourceLineOfCode = lines[lineNum - 1]
  const stackLineOfCode = stackLines[1]

  let clipLength = 6
  let newColumn = -1

  stackLines[1] = sourceLineOfCode

  // Move the column indicator arrow to the left by matching a clip of compiled
  // code from the stack to the original source code. To avoid false matches,
  // we start with a larger clip length and work our way down.
  while (clipLength-- > 1 && newColumn < 0) {
    const clip = stackLineOfCode.substr(column, clipLength)
    clipLength = Math.min(clipLength, clip.length)

    let index = column + 1
    while ((index = sourceLineOfCode.lastIndexOf(clip, index - 1)) > -1) {
      newColumn = index
    }
  }

  if (newColumn < 0) {
    // Remove the column indicator arrow if a new column is not found.
    stackLines.splice(2, 1)
    stackLines[4] = stackLines[4].replace(columnNumRegExp, "")

    if (stackLines[1].length < 6) {
      // Remove the source code line reference if it's too short.
      stackLines.splice(1, 1)
    }
  } else if (newColumn < column) {
    // Update the column indicator arrow and column number.
    stackLines[2] = " ".repeat(newColumn) + "^"
    stackLines[5] = stackLines[5].replace(columnNumRegExp, ":" + newColumn)
  }

  if (stackLines[0].startsWith("repl:")) {
    // Remove the first line of REPL stacks.
    stackLines.shift()
  }
}

function resolveStack(error, stack, sourceCode, compiledCode) {
  sourceCode = typeof sourceCode === "function" ? sourceCode() : sourceCode
  return isParseError(error)
    ? maskParserStack(stack, sourceCode, error.filename)
    : maskStack(stack, sourceCode, compiledCode)
}

function scrubStack(stack) {
  return stack
    .split("\n")
    .filter((line) => ! line.includes(__non_webpack_filename__))
    .join("\n")
}

export default maskStackTrace
