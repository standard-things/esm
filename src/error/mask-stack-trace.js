import WASM from "../constant/wasm.js"

import Module from "../module.js"

import decorateStackTrace from "./decorate-stack-trace.js"
import { extname } from "../safe/path.js"
import get from "../util/get.js"
import getModuleURL from "../util/get-module-url.js"
import getSilent from "../util/get-silent.js"
import isError from "../util/is-error.js"
import isParseError from "../util/is-parse-error.js"
import isPath from "../util/is-path.js"
import readFile from "../fs/read-file.js"
import replaceWithout from "../util/replace-without.js"
import scrubStackTrace from "./scrub-stack-trace.js"
import shared from "../shared.js"
import toExternalError from "../util/to-external-error.js"
import toExternalFunction from "../util/to-external-function.js"
import toString from "../util/to-string.js"

function init() {
  const {
    MAGIC_COOKIE
  } = WASM

  const arrowRegExp = /^(.+)\n( *\^+)\n(\n)?/m
  const atNameRegExp = /^( *at (?:.+? \()?)(.+?)(?=:\d+)/gm
  const blankRegExp = /^\s*$/
  const headerRegExp = /^(.+?):(\d+)(?=\n)/

  function maskStackTrace(error, options = {}) {
    if (! isError(error)) {
      return error
    }

    let column
    let lineNumber

    let {
      content,
      filename,
      inModule
    } = options

    const fromParser = isParseError(error)

    if (fromParser) {
      column = error.column
      lineNumber = error.line

      if (inModule === void 0) {
        inModule = error.inModule
      }

      Reflect.deleteProperty(error, "column")
      Reflect.deleteProperty(error, "inModule")
      Reflect.deleteProperty(error, "line")
    }

    toExternalError(error)

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
      get: toExternalFunction(function () {
        // Prevent re-entering the getter by triggering the setter to convert
        // `error.stack` from an accessor property to a data property.
        this.stack = ""

        const message = toString(get(this, "message"))
        const name = toString(get(this, "name"))
        const newString = tryErrorToString(this)

        let masked = stack.replace(oldString, () => newString)

        masked = fromParser
          ? maskParserStack(masked, name, message, lineNumber, column, content, filename)
          : maskEngineStack(masked, content, filename)

        const scrubber = inModule
          ? (stack) => fileNamesToURLs(scrubStackTrace(stack))
          : scrubStackTrace

        return this.stack = replaceWithout(masked, newString, scrubber)
      }),
      set: toExternalFunction(function (value) {
        Reflect.defineProperty(this, "stack", {
          configurable: true,
          value,
          writable: true
        })
      })
    })

    decorateStackTrace(error)

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
    const scriptFilename = match[1]
    const lineNumber = +match[2]

    let contentLines
    let contentLine

    let useDecoratorLine =
      scriptFilename !== filename &&
      isPath(scriptFilename)

    if (! useDecoratorLine) {
      if (typeof content !== "string" &&
          typeof filename === "string" &&
          extname(filename) !== ".wasm") {
        content = readFile(filename, "utf8")
      }

      if (typeof content === "string" &&
          ! content.startsWith(MAGIC_COOKIE)) {
        const lineIndex = lineNumber - 1

        contentLines = content.split("\n")

        if (lineIndex > -1 &&
            lineIndex < contentLines.length) {
          contentLine = contentLines[lineIndex]
        } else {
          contentLine = ""
        }
      } else {
        useDecoratorLine = true
      }
    }

    let foundArrow = false

    stack = stack.replace(arrowRegExp, (match, decoratorLine, decoratorArrow, decoratorNewline = "") => {
      foundArrow = true

      if (useDecoratorLine) {
        contentLine = decoratorLine
      }

      if (typeof contentLine !== "string") {
        return ""
      }

      if (lineNumber === 1) {
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

    if (foundArrow) {
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

  // Transform parser stack trace from:
  // <type>: <message> (<lineNumber>:<column>)
  //   ...
  // to:
  // path/to/file.js:<lineNumber>
  // <line of code, from the original source, where the error occurred>
  // <column indicator arrow>
  //
  // <type>: <message>
  //   ...
  function maskParserStack(stack, name, message, lineNumber, column, content, filename) {
    const spliceArgs = [0, 1]

    if (typeof filename === "string") {
      spliceArgs.push(filename + ":" + lineNumber)

      if (typeof content !== "string") {
        content = readFile(filename, "utf8")
      }
    }

    if (typeof content === "string") {
      const contentLines = content.split("\n")
      const lineIndex = lineNumber - 1

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

  function replaceHeader(match, filename, lineNumber) {
    return getModuleURL(filename) + ":" + lineNumber
  }

  function tryErrorToString(error) {
    try {
      return toString(get(error, "name")) + ": " +
             toString(get(error, "message"))
    } catch {}

    return ""
  }

  return maskStackTrace
}

export default shared.inited
  ? shared.module.errorMaskStackTrace
  : shared.module.errorMaskStackTrace = init()
