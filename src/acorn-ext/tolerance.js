import alwaysFalse from "../util/always-false.js"
import alwaysTrue from "../util/always-true.js"
import errors from "../parse/errors.js"
import noop from "../util/noop.js"

const engineDupPrefix = "Duplicate export of '"
const parserDupPrefix = "Duplicate export '"

const engineTypePostfix = "may only be used in ES modules"
const parserTypePostfix = "may appear only with 'sourceType: module'"

function enable(parser) {
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
  parser.invalidStringToken = noop

  parser.checkExpressionErrors = checkExpressionErrors

  parser.raise =
  parser.raiseRecoverable = raise

  return parser
}

function checkExpressionErrors(refDestructuringErrors) {
  if (refDestructuringErrors) {
    return refDestructuringErrors.shorthandAssign !== -1
  }

  return false
}

function raise(pos, message) {
  if (message.startsWith(parserDupPrefix)) {
    message = message.replace(parserDupPrefix, engineDupPrefix)
  } else if (message.endsWith(parserTypePostfix)) {
    message = message.replace(parserTypePostfix, engineTypePostfix)
  }

  throw new errors.SyntaxError(this.input, pos, message)
}

export default enable
