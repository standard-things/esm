import CHAR from "../constant/char.js"

import Module from "../module.js"

import decorateStackTrace from "./decorate-stack-trace.js"
import get from "../util/get.js"
import getModuleURL from "../util/get-module-url.js"
import getSilent from "../util/get-silent.js"
import isError from "../util/is-error.js"
import isParseError from "../util/is-parse-error.js"
import scrubStackTrace from "./scrub-stack-trace.js"
import shared from "../shared.js"
import toString from "../util/to-string.js"

function init() {
  const {
    ZERO_WIDTH_NOBREAK_SPACE
  } = CHAR

  const arrowRegExp = /^(.+)\n( *\^+)\n(\n)?/m
  const atNameRegExp = /^( *at (?:.+? \()?)(.+?)(?=:\d+)/gm
  const blankRegExp = /^\s*$/
  const headerRegExp = /^(.+?)(:\d+)(?=\n)/

  function maskStackTrace(error, content, filename, isESM) {
    if (! isError(error)) {
      return error
    }

    decorateStackTrace(error)

    let column
    let line

    const fromParser = isParseError(error)

    if (fromParser) {
      const name = toString(get(error, "name"))
      const ExCtor = shared.external[name]

      column = error.column
      line = error.line

      Reflect.deleteProperty(error, "column")
      Reflect.deleteProperty(error, "line")
      Reflect.setPrototypeOf(error, ExCtor.prototype)
    }

    const stack = get(error, "stack")

    if (typeof stack !== "string") {
      return error
    }

    const oldString = tryErrorToString(error)

    // Defer any file read operations until `error.stack` is accessed. Ideally,
    // we'd wrap `error` in a proxy to defer the initial `error.stack` access.
    // However, `Error.captureStackTrace()` will throw when receiving a proxy
    // wrapped error object.
    Reflect.defineProperty(error, "stack", {
      configurable: true,
      get() {
        this.stack = ""

        const message = toString(get(this, "message"))
        const name = toString(get(this, "name"))
        const newString = tryErrorToString(this)

        let masked = stack.replace(oldString, newString)

        masked = fromParser
          ? maskParserStack(masked, name, message, line, column, content, filename)
          : maskEngineStack(masked, content, filename)

        const scrubber = isESM
          ? (stack) => fileNamesToURLs(scrubStackTrace(stack))
          : (stack) => scrubStackTrace(stack)

        return this.stack = withoutMessage(masked, newString, scrubber)
      },
      set(value) {
        Reflect.defineProperty(this, "stack", {
          configurable: true,
          value,
          writable: true
        })
      }
    })

    return error
  }

  function maskEngineStack(stack, content, filename) {
    const match = headerRegExp.exec(stack)

    if (match === null) {
      if (typeof filename === "string") {
        stack = filename + ":1\n" + stack
      }

      return stack
    }

    const header = match[0]
    const line = +match[2]

    let arrowFound = false

    stack = stack.replace(arrowRegExp, (match, snippet, arrow, newline = "") => {
      arrowFound = true

      if (snippet.indexOf(ZERO_WIDTH_NOBREAK_SPACE) !== -1) {
        if (typeof content === "function") {
          content = content(filename)
        }

        if (typeof content !== "string") {
          return ""
        }

        const codeLines = content.split("\n")
        const codeLine = codeLines[line - 1] || ""

        return codeLine + (codeLine ? "\n\n" : "\n")
      }

      if (line === 1) {
        const wrapper = getSilent(Module, "wrapper")

        if (Array.isArray(wrapper)) {
          const [prefix] = wrapper

          if (typeof prefix === "string" &&
              snippet.startsWith(prefix)) {
            const { length } = prefix

            snippet = snippet.slice(length)
            arrow = arrow.slice(length)
          }
        }
      }

      return snippet + "\n" + arrow + "\n" + newline
    })

    if (arrowFound) {
      return stack
    }

    if (typeof content === "function") {
      content = content(filename)
    }

    if (typeof content !== "string") {
      return stack
    }

    const codeLines = content.split("\n")
    const codeLine = codeLines[line - 1] || ""

    if (codeLine) {
      const { length } = header

      stack =
        stack.slice(0, length) + "\n" +
        codeLine + "\n" +
        stack.slice(length)
    }

    return stack
  }

  // Transform parser stack codeLines from:
  // <type>: <message> (<codeLine>:<column>)
  //   ...
  // to:
  // path/to/file.js:<codeLine>
  // <codeLine of code, from the original source, where the error occurred>
  // <column indicator arrow>
  //
  // <type>: <message>
  //   ...
  function maskParserStack(stack, name, message, line, column, content, filename) {
    const spliceArgs = [0, 1]

    if (typeof filename === "string") {
      spliceArgs.push(filename + ":" + line)
    }

    if (typeof content === "function") {
      content = content(filename)
    }

    if (typeof content === "string") {
      const codeLines = content.split("\n")
      const lineIndex = line - 1

      if (lineIndex < codeLines.length) {
        let arrow = "^"

        if (message.startsWith("Export '")) {
          // Increase arrow count to the length of the identifier.
          arrow = arrow.repeat(message.indexOf("'", 8) - 8)
        }

        const codeLine = codeLines[lineIndex]

        if (! blankRegExp.test(codeLine)) {
          spliceArgs.push(
            codeLine,
            " ".repeat(column) + arrow,
            ""
          )
        }
      }
    }

    const stackLines = stack.split("\n")

    spliceArgs.push(name + ": " + message)
    stackLines.splice(...spliceArgs)
    return stackLines.join("\n")
  }

  function fileNamesToURLs(stack) {
    stack = stack.replace(headerRegExp, replaceHeader)
    return stack.replace(atNameRegExp, replaceAtName)
  }

  function replaceAtName(match, prefix, name) {
    return prefix + getModuleURL(name)
  }

  function replaceHeader(match, name, suffix) {
    return getModuleURL(name) + suffix
  }

  function tryErrorToString(error) {
    try {
      return error.name + ": " + error.message
    } catch (e) {}

    return ""
  }

  function withoutMessage(stack, message, callback) {
    const token = ZERO_WIDTH_NOBREAK_SPACE + "message" + ZERO_WIDTH_NOBREAK_SPACE

    stack = stack.replace(message, token)
    return callback(stack).replace(token, message)
  }

  return maskStackTrace
}

export default shared.inited
  ? shared.module.errorMaskStackTrace
  : shared.module.errorMaskStackTrace = init()
