import alwaysFalse from "../../util/always-false.js"
import alwaysTrue from "../../util/always-true.js"
import noop from "../../util/noop.js"
import shared from "../../shared.js"

function init() {
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

      parser.checkExpressionErrors = checkExpressionErrors
      return parser
    }
  }

  function checkExpressionErrors(refDestructuringErrors) {
    if (refDestructuringErrors) {
      return refDestructuringErrors.shorthandAssign !== -1
    }

    return false
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserTolerance
  : shared.module.acornParserTolerance = init()
