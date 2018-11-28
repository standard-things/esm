import Module from "../module.js"

import decorateStackTrace from "./decorate-stack-trace.js"
import get from "../util/get.js"
import getModuleURL from "../util/get-module-url.js"
import getSilent from "../util/get-silent.js"
import isError from "../util/is-error.js"
import isParseError from "../util/is-parse-error.js"
import replaceWithout from "../util/replace-without.js"
import scrubStackTrace from "./scrub-stack-trace.js"
import shared from "../shared.js"
import toExternalError from "../util/to-external-error.js"
import toString from "../util/to-string.js"

function init() {
  const arrowRegExp = /^(.+)\n( *\^+)\n(\n)?/m
  const atNameRegExp = /^( *at (?:.+? \()?)(.+?)(?=:\d+)/gm
  const blankRegExp = /^\s*$/
  const headerRegExp = /^(.+?):(\d+)(?=\n)/

  function maskStackTrace(error, content, filename, isESM) {
    if (! isError(error)) {
      return error
    }

    decorateStackTrace(error)

    let column
    let lineNum

    const fromParser = isParseError(error)

    if (fromParser) {
      column = error.column
      lineNum = error.line

      toExternalError(error)
      Reflect.deleteProperty(error, "column")
      Reflect.deleteProperty(error, "line")
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
          ? maskParserStack(masked, name, message, lineNum, column, content, filename)
          : maskEngineStack(masked, content, filename)

        const scrubber = isESM
          ? (stack) => fileNamesToURLs(scrubStackTrace(stack))
          : (stack) => scrubStackTrace(stack)

        return this.stack = replaceWithout(masked, newString, scrubber)
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
      return typeof filename === "string"
        ? filename + ":1\n" + stack
        : stack
    }

    const header = match[0]
    const lineNum = +match[2]

    if (typeof content === "function") {
      content = content(filename)
    }

    let contentLines
    let contentLine

    if (typeof content === "string") {
      contentLines = content.split("\n")
      contentLine = contentLines[lineNum - 1] || ""
    }

    let arrowFound = false

    stack = stack.replace(arrowRegExp, (match, decoratorLine, decoratorArrow, decoratorNewline = "") => {
      arrowFound = true

      if (typeof contentLine !== "string") {
        return ""
      }

      if (lineNum === 1) {
        const wrapper = getSilent(Module, "wrapper")

        if (Array.isArray(wrapper)) {
          const [prefix] = wrapper

          if (typeof prefix === "string" &&
              decoratorLine.startsWith(prefix)) {
            const { length } = prefix

            decoratorLine = decoratorLine.slice(length)
            decoratorArrow = decoratorArrow.slice(length)
          }
        }
      }

      return decoratorLine === contentLine
        ? contentLine + "\n" + decoratorArrow + "\n" + decoratorNewline
        : contentLine + (contentLine ? "\n\n" : "\n")
    })

    if (arrowFound) {
      return stack
    }

    if (contentLine &&
        typeof contentLine === "string") {
      const { length } = header

      stack =
        stack.slice(0, length) + "\n" +
        contentLine + "\n" +
        stack.slice(length)
    }

    return stack
  }

  // Transform parser stack contentLines from:
  // <type>: <message> (<contentLine>:<column>)
  //   ...
  // to:
  // path/to/file.js:<contentLine>
  // <contentLine of code, from the original source, where the error occurred>
  // <column indicator arrow>
  //
  // <type>: <message>
  //   ...
  function maskParserStack(stack, name, message, lineNum, column, content, filename) {
    const spliceArgs = [0, 1]

    if (typeof filename === "string") {
      spliceArgs.push(filename + ":" + lineNum)
    }

    if (typeof content === "function") {
      content = content(filename)
    }

    if (typeof content === "string") {
      const contentLines = content.split("\n")
      const lineIndex = lineNum - 1

      if (lineIndex < contentLines.length) {
        let decoratorArrow = "^"

        if (message.startsWith("Export '")) {
          // Increase arrow count to the length of the identifier.
          decoratorArrow = decoratorArrow.repeat(message.indexOf("'", 8) - 8)
        }

        const contentLine = contentLines[lineIndex]

        if (! blankRegExp.test(contentLine)) {
          spliceArgs.push(
            contentLine,
            " ".repeat(column) + decoratorArrow,
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
    return stack
      .replace(headerRegExp, replaceHeader)
      .replace(atNameRegExp, replaceAtName)
  }

  function replaceAtName(match, prefix, name) {
    return prefix + getModuleURL(name)
  }

  function replaceHeader(match, name, lineNum) {
    return getModuleURL(name) + ":" + lineNum
  }

  function tryErrorToString(error) {
    try {
      return error.name + ": " + error.message
    } catch {}

    return ""
  }

  return maskStackTrace
}

export default shared.inited
  ? shared.module.errorMaskStackTrace
  : shared.module.errorMaskStackTrace = init()
