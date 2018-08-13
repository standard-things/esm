import CHAR from "../constant/char.js"

import Module from "../module.js"

import decorateStackTrace from "./decorate-stack-trace.js"
import getModuleURL from "../util/get-module-url.js"
import getSilent from "../util/get-silent.js"
import isError from "../util/is-error.js"
import isParseError from "../util/is-parse-error.js"
import scrubStackTrace from "./scrub-stack-trace.js"
import shared from "../shared.js"

function init() {
  const {
    ZERO_WIDTH_NOBREAK_SPACE
  } = CHAR

  const arrowRegExp = /^(.+)\n( *\^+)\n(\n)?/m
  const atNameRegExp = /^( *at (?:.+? \()?)(.+?)(?=:\d+)/gm
  const blankRegExp = /^\s*$/
  const engineLineRegExp = /^.+?:(\d+)(?=\n)/
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
      const ExCtor = shared.external[error.name]

      column = error.column
      line = error.line

      Reflect.deleteProperty(error, "column")
      Reflect.deleteProperty(error, "line")
      Reflect.setPrototypeOf(error, ExCtor.prototype)
    }

    let { stack } = error

    if (typeof stack !== "string") {
      return error
    }

    const oldToStringed = error.name + ": " + error.message

    // Defer any file read operations until `error.stack` is accessed. Ideally,
    // we'd wrap `error` in a proxy to defer the initial `error.stack` access.
    // However, `Error.captureStackTrace()` will throw when receiving a proxy
    // wrapped error object.
    Reflect.defineProperty(error, "stack", {
      configurable: true,
      get() {
        this.stack = ""

        const { message, name } = this
        const newToStringed = name + ": " + message

        stack = stack.replace(oldToStringed, newToStringed)
        stack = fromParser
          ? maskParserStack(stack, name, message, line, column, content, filename)
          : maskEngineStack(stack, content, filename)

        const scrubber = isESM
          ? (stack) => fileNamesToURLs(scrubStackTrace(stack))
          : (stack) => scrubStackTrace(stack)

        stack = withoutMessage(stack, newToStringed, scrubber)
        return this.stack = stack
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
    const match = engineLineRegExp.exec(stack)

    if (typeof filename === "string" &&
        ! headerRegExp.test(stack)) {
      stack = filename + ":1\n" + stack
    }

    if (match === null) {
      return stack
    }

    const line = +match[1]

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

    return stack.replace(headerRegExp, (match) => {
      const codeLines = content.split("\n")
      const codeLine = codeLines[line - 1] || ""

      if (codeLine) {
        match += "\n" + codeLine + "\n"
      }

      return match
    })
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
