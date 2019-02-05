import alwaysFalse from "../../util/always-false.js"
import alwaysTrue from "../../util/always-true.js"
import noop from "../../util/noop.js"
import shared from "../../shared.js"

function init() {
  const scopes = new Map

  const Plugin = {
    enable(parser) {
      parser.isDirectiveCandidate = alwaysFalse
      parser.strictDirective = alwaysFalse
      parser.isSimpleParamList = alwaysTrue
      parser.adaptDirectivePrologue = noop
      parser.checkLocalExport = noop
      parser.checkParams = noop
      parser.checkPatternErrors = noop
      parser.checkPatternExport = noop
      parser.checkPropClash = noop
      parser.checkVariableExport = noop
      parser.checkYieldAwaitInDefaultParams = noop
      parser.declareName = noop
      parser.invalidStringToken = noop
      parser.validateRegExpFlags = noop
      parser.validateRegExpPattern = noop
      parser.checkExpressionErrors = checkExpressionErrors
      parser.enterScope = enterScope

      return parser
    }
  }

  function checkExpressionErrors(refDestructuringErrors) {
    if (refDestructuringErrors) {
      return refDestructuringErrors.shorthandAssign !== -1
    }

    return false
  }

  function enterScope(flags) {
    this.scopeStack.push(getScope(flags))
  }

  function getScope(flags) {
    let scope = scopes.get(flags)

    if (scope === void 0) {
      scope = {
        flags,
        functions: [],
        lexical: [],
        var: []
      }

      scopes.set(flags, scope)
    }

    return scope
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserTolerance
  : shared.module.acornParserTolerance = init()
