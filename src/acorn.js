import "./vendor/acorn/src/expression.js"
import "./vendor/acorn/src/location.js"
import "./vendor/acorn/src/lval.js"
import "./vendor/acorn/src/node.js"
import "./vendor/acorn/src/scope.js"
import "./vendor/acorn/src/statement.js"
import "./vendor/acorn/src/tokencontext.js"
import "./vendor/acorn/src/tokenize.js"

import {
  lineBreak as lineBreakRegExp,
  skipWhiteSpace as skipWhiteSpaceRegExp
} from "./vendor/acorn/src/whitespace.js"

import { Parser } from "./vendor/acorn/src/state.js"
import { getLineInfo } from "./vendor/acorn/src/locutil.js"
import { types as tokTypes } from "./vendor/acorn/src/tokentype.js"

const literalRegExp = /^(?:'((?:\\.|[^'])*?)'|"((?:\\.|[^"])*?)"|;)/

export {
  Parser,
  getLineInfo,
  lineBreakRegExp,
  literalRegExp,
  skipWhiteSpaceRegExp,
  tokTypes
}

export default {
  __proto__: null,
  Parser,
  getLineInfo,
  lineBreakRegExp,
  literalRegExp,
  skipWhiteSpaceRegExp,
  tokTypes
}
