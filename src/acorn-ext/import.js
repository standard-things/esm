import { tokTypes as tt } from "acorn/dist/acorn.es.js"
import Parser from "../parser.js"
import wrapCall from "../util/wrap-call.js"

function enable(parser) {
  const key = typeof parser.parseImportSpecifiers === "function"
    ? "parseImportSpecifiers"
    : "parseImportSpecifierList"

  parser[key] = wrapCall(parser[key], parseImportSpecifiers)
  return parser
}

function parseImportSpecifiers(func) {
  const specifiers = []

  do {
    if (this.type === tt.name) {
      // ... def [, ...]
      specifiers.push(parseImportDefaultSpecifier(this))
    } else if (this.type === tt.star) {
      // ... * as ns [, ...]
      specifiers.push(parseImportNamespaceSpecifier(this))
    } else if (this.type === tt.braceL) {
      // ... { x, y as z } [, ...]
      specifiers.push.apply(specifiers, func.call(this))
    }
  }
  while (this.eat(tt.comma))

  return specifiers
}

function parseImportDefaultSpecifier(parser) {
  // ... def
  const specifier = parser.startNode()
  specifier.local = parser.parseIdent()
  return parser.finishNode(specifier, "ImportDefaultSpecifier")
}

function parseImportNamespaceSpecifier(parser) {
  // ... * as ns
  const star = parser.startNode()
  parser.next()

  if (! parser.eatContextual("as")) {
    Parser.raise(parser)
  }

  star.local = parser.parseIdent()
  return parser.finishNode(star, "ImportNamespaceSpecifier")
}

export { enable }
