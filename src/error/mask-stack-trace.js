import GenericArray from "../generic/array.js"
import GenericRegExp from "../generic/regexp.js"
import GenericString from "../generic/string.js"
import Module from "../module.js"

import decorateStackTrace from "./decorate-stack-trace.js"
import getURLFromFilePath from "../util/get-url-from-file-path.js"
import isParseError from "../util/is-parse-error.js"
import isPath from "../util/is-path.js"
import scrubStackTrace from "./scrub-stack-trace.js"
import setProperty from "../util/set-property.js"

const ZWJ = "\u200d"

const engineMessageRegExp = /^.+?:(\d+)(?=\n)/
const parserMessageRegExp = /^(.+?): (.+?) \((\d+):(\d+)\)(?=\n)/

const arrowRegExp = /^(.+\n)( *\^+\n)(\n)?/m
const atNameRegExp = /\((.+?)(?=:\d+)/g
const blankRegExp = /^\s*$/
const headerRegExp = /^(.+?)(?=:\d+\n)/

function maskStackTrace(error, content, filename, isESM) {
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

      const masker = isParseError(error)
        ? maskParserStack
        : maskEngineStack

      const scrubber = isESM
        ? (stack) => fileNamesToURLs(scrubStackTrace(stack))
        : (stack) => scrubStackTrace(stack)

      stack = GenericString.replace(stack, message, newMessage)
      stack = masker(stack, content, filename)
      stack = withoutMessage(stack, newMessage, scrubber)

      return error.stack = stack
    },
    set(value) {
      setProperty(error, "stack", {
        enumerable: false,
        value
      })
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
  const parts = GenericRegExp.exec(parserMessageRegExp, stack)

  if (parts === null) {
    return stack
  }

  const type = parts[1]
  const message = parts[2]
  const lineNum = +parts[3]
  const lineIndex = lineNum - 1
  const column = +parts[4]
  const spliceArgs = [0, 1]
  const stackLines = GenericString.split(stack, "\n")

  if (typeof filename === "string") {
    GenericArray.push(spliceArgs, filename + ":" + lineNum)
  }

  if (typeof content === "function") {
    content = content(filename)
  }

  if (typeof content === "string") {
    const lines = GenericString.split(content, "\n")

    if (lineIndex < lines.length) {
      let arrow = "^"

      if (GenericString.startsWith(message, "Export '")) {
        // Increase arrow count to the length of the identifier.
        arrow = GenericString.repeat(arrow, GenericString.indexOf(message, "'", 8) - 8)
      }

      const line = lines[lineIndex]

      if (! GenericRegExp.test(blankRegExp, line)) {
        GenericArray.push(spliceArgs,
          line,
          GenericString.repeat(" ", column) + arrow,
          ""
        )
      }
    }
  }

  GenericArray.push(spliceArgs, type + ": " + message)
  GenericArray.splice(stackLines, ...spliceArgs)
  return GenericArray.join(stackLines, "\n")
}

function maskEngineStack(stack, content, filename) {
  const parts = GenericRegExp.exec(engineMessageRegExp, stack)

  if (typeof filename === "string" &&
      ! GenericRegExp.test(headerRegExp, stack)) {
    stack = filename + ":1\n" + stack
  }

  if (parts === null) {
    return stack
  }

  return GenericString.replace(stack, arrowRegExp, (match, snippet, arrow, newline = "") => {
    const lineNum = +parts[1]

    if (GenericString.indexOf(snippet, ZWJ) !== -1) {
      if (typeof content === "function") {
        content = content(filename)
      }

      if (typeof content !== "string") {
        return ""
      }

      const lines = GenericString.split(content, "\n")
      const line = lines[lineNum - 1] || ""
      return line + (line ? "\n\n" : "\n")
    }

    if (lineNum !== 1) {
      return snippet + arrow + newline
    }

    const [prefix] = Module.wrapper

    if (GenericString.startsWith(snippet, prefix)) {
      const { length } = prefix

      snippet = GenericString.slice(snippet, length)
      arrow = GenericString.slice(arrow, length)
    }

    return snippet + arrow + newline
  })
}

function fileNamesToURLs(stack) {
  stack = GenericString.replace(stack, headerRegExp, resolveURL)
  return GenericString.replace(stack, atNameRegExp, replaceAtName)
}

function replaceAtName(match, name) {
  return "(" + resolveURL(name)
}

function resolveURL(name) {
  return isPath(name) ? getURLFromFilePath(name) : name
}

function withoutMessage(stack, message, callback) {
  const token = ZWJ + "message" + ZWJ

  stack = GenericString.replace(stack, message, token)
  return GenericString.replace(callback(stack), token, message)
}

export default maskStackTrace
