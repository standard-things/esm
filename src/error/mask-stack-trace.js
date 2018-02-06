import Module from "../module.js"

import decorateStackTrace from "./decorate-stack-trace.js"
import getURLFromFilePath from "../util/get-url-from-file-path.js"
import isError from "../util/is-error.js"
import isParseError from "../util/is-parse-error.js"
import isPath from "../util/is-path.js"
import setProperty from "../util/set-property.js"

const ZWJ = "\u200d"

const stdFilename = __non_webpack_module__.filename

const engineMessageRegExp = /^.+?:(\d+)(?=\n)/
const parserMessageRegExp = /^(.+?): (.+?) \((\d+):(\d+)\)(?=\n)/

const arrowRegExp = /^(.+\n)( *\^+\n)(\n)?/m
const atNameRegExp = /\((.+?)(?=:\d+)/g
const columnInfoRegExp = /:1:\d+(?=\)?$)/gm
const headerRegExp = /^(.+?)(?=:\d+\n)/

function maskStackTrace(error, content, filename, isESM) {
  if (! isError(error)) {
    return error
  }

  decorateStackTrace(error)

  let { stack } = error

  if (typeof stack !== "string") {
    return error
  }

  const message = String(error)

  // Defer any file read operations until `error.stack` is accessed. Ideally,
  // we'd wrap `error` in a proxy to defer the initial `error.stack` access.
  // However, `Error.captureStackTrace()` will throw when receiving a proxy
  // wrapped error object.
  return setProperty(error, "stack", {
    enumerable: false,
    get() {
      const newMessage = String(error)
      stack = stack.replace(message, newMessage)

      const masker = isParseError(error) ? maskParserStack : maskEngineStack
      stack = masker(stack, content, filename)

      const scrubber = (stack) => isESM ? fileNamesToURLs(scrub(stack)) : scrub(stack)
      stack = withoutMessage(stack, newMessage, scrubber)

      return error.stack = stack
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
function maskParserStack(stack, content, filename) {
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

  if (typeof filename === "string") {
    spliceArgs.push(filename + ":" + lineNum)
  }

  if (typeof content === "function") {
    content = content(filename)
  }

  if (typeof content === "string") {
    const lines = content.split("\n")

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

function maskEngineStack(stack, content, filename) {
  const parts = engineMessageRegExp.exec(stack)

  if (typeof filename === "string" &&
      ! headerRegExp.test(stack)) {
    stack = filename + ":1\n" + stack
  }

  if (parts === null) {
    return stack
  }

  return stack.replace(arrowRegExp, (match, snippet, arrow, newline = "") => {
    const lineNum = +parts[1]

    if (snippet.indexOf(ZWJ) !== -1) {
      if (typeof content === "function") {
        content = content(filename)
      }

      if (typeof content !== "string") {
        return ""
      }

      const lines = content.split("\n")
      const line = lines[lineNum - 1] || ""
      return line + (line ? "\n\n" : "\n")
    }

    if (lineNum !== 1) {
      return snippet + arrow + newline
    }

    const [prefix] = Module.wrapper

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
    .filter((line) => line.indexOf(stdFilename) === -1)
    .join("\n")
    .replace(columnInfoRegExp, ":1")
}

function withoutMessage(stack, message, callback) {
  const token = ZWJ + "message" + ZWJ
  stack = stack.replace(message, token)
  return callback(stack).replace(token, message)
}

export default maskStackTrace
