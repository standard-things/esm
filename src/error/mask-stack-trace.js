import Module from "../module.js"

import decorateStackTrace from "./decorate-stack-trace.js"
import getURLFromFilePath from "../util/get-url-from-file-path.js"
import isError from "../util/is-error.js"
import isParseError from "../util/is-parse-error.js"
import isPath from "../util/is-path.js"
import setDescriptor from "../util/set-descriptor.js"
import setProperty from "../util/set-property.js"

const ZWJ = "\u200d"

const engineMessageRegExp = /^.+?:(\d+)(?=\n)/
const parserMessageRegExp = /^(.+?): (.+?) \((\d+):(\d+)\)(?=\n)/

const atNameRegExp = /\((.+?)(?=:\d+)/g
const headerRegExp = /^(.+?)(?=:\d+\n)/
const removeColumnInfoRegExp = /:1:\d+(?=\)?$)/gm
const replaceArrowRegExp = /^(.+\n)( *\^+\n)(\n)?/m

function maskStackTrace(error, sourceCode, filePath, useURLs) {
  if (! isError(error)) {
    return error
  }

  decorateStackTrace(error)
  let { message, stack } = error

  // Defer any file read operations until `error.stack` is accessed. Ideally,
  // we'd wrap `error` in a proxy to defer the initial `error.stack` access.
  // However, `Error.captureStackTrace()` will throw when receiving a proxy
  // wrapped error object.
  return setDescriptor(error, "stack", {
    configurable: true,
    enumerable: false,
    get() {
      stack = stack.replace(message, error.message)
      message = error.message

      stack = isParseError(error)
        ? maskParserStack(stack, sourceCode, filePath)
        : maskEngineStack(stack, sourceCode, filePath)

      return error.stack = withoutMessage(stack, message, (stack) => {
        stack = scrub(stack)
        return useURLs ? fileNamesToURLs(stack) : stack
      })
    },
    set(value) {
      setProperty(error, "stack", { enumerable: false, value })
    }
  })
}

// Transform parser stack lines from:
// <type>: <message> (<line>:<column>)
//   ...
// to:
// path/to/file.js:<line>
// <line of code, from the original source, where the error occurred>
// <column indicator arrow>
//
// <type>: <message>
//   ...
function maskParserStack(stack, sourceCode, filePath) {
  const parts = parserMessageRegExp.exec(stack)

  if (parts === null) {
    return stack
  }

  const type = parts[1]
  const message = parts[2]
  const lineNum = +parts[3]
  const lineIndex = lineNum - 1
  const column = +parts[4]
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

    if (lineIndex < lines.length) {
      let arrow = "^"

      if (message.startsWith("Export '")) {
        // Increase arrow count to the length of the identifier.
        arrow = arrow.repeat(message.indexOf("'", 8) - 8)
      }

      spliceArgs.push(lines[lineIndex], " ".repeat(column) + arrow, "")
    }
  }

  spliceArgs.push(type + ": " + message)
  stackLines.splice(...spliceArgs)
  return stackLines.join("\n")
}

function maskEngineStack(stack, sourceCode, filePath) {
  const parts = engineMessageRegExp.exec(stack)

  if (parts === null) {
    return stack
  }

  return stack.replace(replaceArrowRegExp, (match, snippet, arrow, newline = "") => {
    const lineNum = +parts[1]

    if (snippet.includes(ZWJ)) {
      if (typeof sourceCode === "function") {
        sourceCode = sourceCode(filePath)
      }

      if (typeof sourceCode !== "string") {
        return ""
      }

      const lines = sourceCode.split("\n")
      const line = lines[lineNum - 1] || ""
      return line + (line ? "\n" : "") + (newline || "\n")
    }

    if (lineNum !== 1) {
      return snippet + arrow + newline
    }

    const { wrapper } = Module
    const [prefix] = wrapper

    if (snippet.startsWith(prefix)) {
      const { length } = prefix
      snippet = snippet.slice(length)
      arrow = arrow.slice(length)
    }

    return snippet + arrow + newline
  })
}

function fileNamesToURLs(stack) {
  return stack
    .replace(headerRegExp, resolveURL)
    .replace(atNameRegExp, replaceAtName)
}

function replaceAtName(match, name) {
  return "(" + resolveURL(name)
}

function resolveURL(name) {
  return isPath(name) ? getURLFromFilePath(name) : name
}

function scrub(stack) {
  return stack
    .split("\n")
    .filter((line) => ! line.includes(__non_webpack_module__.filename))
    .join("\n")
    .replace(removeColumnInfoRegExp, ":1")
}

function withoutMessage(stack, message, callback) {
  stack = stack.replace(message, "$message$")
  return callback(stack).replace("$message$", message)
}

export default maskStackTrace
