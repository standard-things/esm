import Parser from "../parser.js"

import shared from "../shared.js"

function init() {
  let flyweight

  function branch(parser) {
    if (flyweight === void 0 ||
        flyweight === parser) {
      flyweight = createFlyweight()
    }

    flyweight.awaitIdentPos = parser.awaitIdentPos
    flyweight.awaitPos = parser.awaitPos
    flyweight.containsEsc = parser.containsEsc
    flyweight.curLine = parser.curLine
    flyweight.end = parser.end
    flyweight.exprAllowed = parser.exprAllowed
    flyweight.inModule = parser.inModule
    flyweight.input = parser.input
    flyweight.inTemplateElement = parser.inTemplateElement
    flyweight.lastTokEnd = parser.lastTokEnd
    flyweight.lastTokStart = parser.lastTokStart
    flyweight.lineStart = parser.lineStart
    flyweight.pos = parser.pos
    flyweight.potentialArrowAt = parser.potentialArrowAt
    flyweight.sourceFile = parser.sourceFile
    flyweight.start = parser.start
    flyweight.strict = parser.strict
    flyweight.type = parser.type
    flyweight.value = parser.value
    flyweight.yieldPos = parser.yieldPos

    return flyweight
  }

  function createFlyweight() {
    return Parser.create("", {
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      ecmaVersion: 10
    })
  }

  return branch
}

export default shared.inited
  ? shared.module.parseBranch
  : shared.module.parseBranch = init()
