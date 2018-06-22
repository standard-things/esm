import alwaysFalse from "../../util/always-false.js"
import alwaysTrue from "../../util/always-true.js"
import errors from "../../parse/errors.js"
import noop from "../../util/noop.js"
import shared from "../../shared.js"
import { tokTypes as tt } from "../../acorn.js"

function init() {
  const PARSER_DUPLICATE_EXPORT_PREFIX = "Duplicate export '"
  const PARSER_IMPORT_EXPORT_IN_SCRIPT_POSTFIX = "may appear only with 'sourceType: module'"
  const PARSER_UNTERMINATED_TEMPLATE_PREFIX = "Unterminated template"

  const ENGINE_DUPLICATE_EXPORT_PREFIX = "Duplicate export of '"
  const ENGINE_IMPORT_EXPORT_IN_SCRIPT_POSTFIX = "may only be used in ES modules"
  const ENGINE_UNTERMINATED_TEMPLATE_PREFIX = "Unterminated template literal"

  const Plugin = {
    enable(parser) {
      parser.isDirectiveCandidate =
      parser.strictDirective = alwaysFalse

      parser.canDeclareLexicalName =
      parser.canDeclareVarName =
      parser.isSimpleParamList = alwaysTrue

      parser.adaptDirectivePrologue =
      parser.checkParams =
      parser.checkPatternErrors =
      parser.checkPatternExport =
      parser.checkPropClash =
      parser.checkVariableExport =
      parser.checkYieldAwaitInDefaultParams =
      parser.declareLexicalName =
      parser.declareVarName =
      parser.enterFunctionScope =
      parser.enterLexicalScope =
      parser.exitFunctionScope =
      parser.exitLexicalScope =
      parser.invalidStringToken =
      parser.validateRegExpFlags =
      parser.validateRegExpPattern = noop

      parser.raise =
      parser.raiseRecoverable = raise

      parser.checkExpressionErrors = checkExpressionErrors
      parser.parseExprList = parseExprList
      parser.unexpected = unexpected

      return parser
    }
  }

  function checkExpressionErrors(refDestructuringErrors) {
    if (refDestructuringErrors) {
      return refDestructuringErrors.shorthandAssign !== -1
    }

    return false
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
          this.raise(this.start, "missing ) after argument list")
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
    if (message.startsWith(PARSER_DUPLICATE_EXPORT_PREFIX)) {
      message = message.replace(PARSER_DUPLICATE_EXPORT_PREFIX, ENGINE_DUPLICATE_EXPORT_PREFIX)
    } else if (message.startsWith(PARSER_UNTERMINATED_TEMPLATE_PREFIX)) {
      message = message.replace(PARSER_UNTERMINATED_TEMPLATE_PREFIX, ENGINE_UNTERMINATED_TEMPLATE_PREFIX)
    } else if (message.endsWith(PARSER_IMPORT_EXPORT_IN_SCRIPT_POSTFIX)) {
      message = message.replace(PARSER_IMPORT_EXPORT_IN_SCRIPT_POSTFIX, ENGINE_IMPORT_EXPORT_IN_SCRIPT_POSTFIX)
    }

    throw new errors.SyntaxError(this.input, pos, message)
  }

  function unexpected(pos) {
    if (pos == null) {
      pos = this.start
    }

    const message = pos === this.input.length
      ? "Unexpected end of input"
      : "Invalid or unexpected token"

    this.raise(pos != null ? pos : this.start, message)
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserTolerance
  : shared.module.acornParserTolerance = init()
