import { types as tt } from "../vendor/acorn/src/tokentype.js"
import unexpected from "../parse/unexpected.js"
import wrap from "../util/wrap.js"

function enable(parser) {
  const key = typeof parser.parseImportSpecifiers === "function"
    ? "parseImportSpecifiers"
    : "parseImportSpecifierList"

  parser[key] = wrap(parser[key], parseImportSpecifiers)
  return parser
}

function parseImportSpecifiers(func, args) {
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
      specifiers.push(...func.apply(this, args))
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
    unexpected(parser)
  }

  star.local = parser.parseIdent()
  return parser.finishNode(star, "ImportNamespaceSpecifier")
}

export { enable }
