import alwaysFalse from "../util/always-false.js"
import alwaysTrue from "../util/always-true.js"
import errors from "../parse/errors.js"
import noop from "../util/noop.js"
import wrap from "../util/wrap.js"

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
  parser.checkLVal = wrap(parser.checkLVal, strictWrapper)
  parser.raise = raise
  parser.raiseRecoverable = raiseRecoverable

  parser.strict = false
  return parser
}

function checkExpressionErrors(refDestructuringErrors) {
  if (refDestructuringErrors) {
    return refDestructuringErrors.shorthandAssign !== -1
  }

  return false
}

function raise(pos, message) {
  // Correct message for `let default`:
  // https://github.com/ternjs/acorn/issues/544
  if (message === "The keyword 'let' is reserved") {
    message = "Unexpected token"
  } else if (message.endsWith(parserTypePostfix)) {
    message = message.replace(parserTypePostfix, engineTypePostfix)
  }

  throw new errors.SyntaxError(this.input, pos, message)
}

function raiseRecoverable(pos, message) {
  if (message.startsWith(parserDupPrefix)) {
    this.raise(pos, message.replace(parserDupPrefix, engineDupPrefix))
  }

  if (message.startsWith("Binding ") ||
      message === "new.target can only be used in functions" ||
      message === "The keyword 'await' is reserved") {
    this.raise(pos, message)
  }
}

function strictWrapper(func, args) {
  this.strict = true

  try {
    return func.apply(this, args)
  } finally {
    this.strict = false
  }
}

export { enable }
