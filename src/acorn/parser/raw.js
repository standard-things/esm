import shared from "../../shared.js"
import { tokTypes as tt } from "../../acorn.js"

function init() {
  const Plugin = {
    enable(parser) {
      parser.parseLiteral = parseLiteral
      parser.parseTemplateElement = parseTemplateElement

      return parser
    }
  }

  function parseLiteral(value) {
    const node = this.startNode()

    node.raw = ""
    node.value = value

    this.next()

    return this.finishNode(node, "Literal")
  }

  function parseTemplateElement() {
    const node = this.startNode()

    node.value = {
      cooked: "",
      raw: ""
    }

    this.next()

    node.tail = this.type === tt.backQuote

    return this.finishNode(node, "TemplateElement")
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserLiteral
  : shared.module.acornParserLiteral = init()
