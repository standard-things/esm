import alwaysFalse from "../../util/always-false.js"
import alwaysTrue from "../../util/always-true.js"
import errors from "../../parse/errors.js"
import noop from "../../util/noop.js"
import shared from "../../shared.js"

function init() {
  const ENGINE_DUP_PREFIX = "Duplicate export of '"
  const PARSER_DUP_PREFIX = "Duplicate export '"

  const ENGINE_TYPE_POSTFIX = "may only be used in ES modules"
  const PARSER_TYPE_POSTFIX = "may appear only with 'sourceType: module'"

  const Plugin = {
    __proto__: null,
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

      parser.checkExpressionErrors = checkExpressionErrors

      parser.raise =
      parser.raiseRecoverable = raise

      return parser
    }
  }

  function checkExpressionErrors(refDestructuringErrors) {
    if (refDestructuringErrors) {
      return refDestructuringErrors.shorthandAssign !== -1
    }

    return false
  }

  function raise(pos, message) {
    if (message.startsWith(PARSER_DUP_PREFIX)) {
      message = message.replace(PARSER_DUP_PREFIX, ENGINE_DUP_PREFIX)
    } else if (message.endsWith(PARSER_TYPE_POSTFIX)) {
      message = message.replace(PARSER_TYPE_POSTFIX, ENGINE_TYPE_POSTFIX)
    }

    throw new errors.SyntaxError(this.input, pos, message)
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserTolerance
  : shared.module.acornParserTolerance = init()
