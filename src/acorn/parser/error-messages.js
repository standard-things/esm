import errors from "../../parse/errors.js"
import shared from "../../shared.js"
import { tokTypes as tt } from "../../acorn.js"

function init() {
  const PARSER_DUPLICATE_EXPORT = "Duplicate export '"
  const PARSER_ILLEGAL_RETURN_STATEMENT = "'return' outside of function"
  const PARSER_IMPORT_EXPORT_IN_SCRIPT = "may appear only with 'sourceType: module'"
  const PARSER_UNTERMINATED_STRING = "Unterminated string constant"
  const PARSER_UNTERMINATED_TEMPLATE = "Unterminated template"

  const ENGINE_DUPLICATE_EXPORT = "Duplicate export of '"
  const ENGINE_ILLEGAL_RETURN_STATEMENT = "Illegal return statement"
  const ENGINE_IMPORT_EXPORT_IN_SCRIPT = "may only be used in ES modules"
  const ENGINE_UNEXPECTED_EOS = "Unexpected end of input"
  const ENGINE_UNEXPECTED_TOKEN = "Invalid or unexpected token"
  const ENGINE_UNTERMINATED_ARGUMENTS_LIST = "missing ) after argument list"
  const ENGINE_UNTERMINATED_TEMPLATE = "Unterminated template literal"

  const Plugin = {
    enable(parser) {
      parser.parseExprList = parseExprList

      parser.raise =
      parser.raiseRecoverable = raise

      parser.unexpected = unexpected
      return parser
    }
  }

  function parseExprList(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
    const elements = []

    let first = true

    while (! this.eat(close)) {
      if (! first) {
        if (allowEmpty ||
            close !== tt.parenR) {
          this.expect(tt.comma)
        } else if (! this.eat(tt.comma)) {
          this.raise(this.start, ENGINE_UNTERMINATED_ARGUMENTS_LIST)
        }

        if (allowTrailingComma &&
            this.afterTrailingComma(close)) {
          break
        }
      } else {
        first = false
      }

      let element

      if (allowEmpty &&
          this.type === tt.comma) {
        element = null
      } else if (this.type === tt.ellipsis) {
        element = this.parseSpread(refDestructuringErrors)

        if (refDestructuringErrors &&
            this.type === tt.comma &&
            refDestructuringErrors.trailingComma < 0) {
          refDestructuringErrors.trailingComma = this.start
        }
      } else {
        element = this.parseMaybeAssign(false, refDestructuringErrors)
      }

      elements.push(element)
    }

    return elements
  }

  function raise(pos, message) {
    if (message === PARSER_ILLEGAL_RETURN_STATEMENT) {
      message = ENGINE_ILLEGAL_RETURN_STATEMENT
    } else if (message === PARSER_UNTERMINATED_STRING) {
      message = ENGINE_UNEXPECTED_TOKEN
    } else if (message === PARSER_UNTERMINATED_TEMPLATE) {
      message = ENGINE_UNTERMINATED_TEMPLATE
    } else if (message.startsWith(PARSER_DUPLICATE_EXPORT)) {
      message = message.replace(PARSER_DUPLICATE_EXPORT, ENGINE_DUPLICATE_EXPORT)
    } else if (message.endsWith(PARSER_IMPORT_EXPORT_IN_SCRIPT)) {
      message = message.replace(PARSER_IMPORT_EXPORT_IN_SCRIPT, ENGINE_IMPORT_EXPORT_IN_SCRIPT)
    }

    throw new errors.SyntaxError(this.input, pos, message)
  }

  function unexpected(pos) {
    if (pos == null) {
      pos = this.start
    }

    const message = this.type === tt.eof
      ? ENGINE_UNEXPECTED_EOS
      : ENGINE_UNEXPECTED_TOKEN

    this.raise(pos != null ? pos : this.start, message)
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserErrorMessages
  : shared.module.acornParserErrorMessages = init()
