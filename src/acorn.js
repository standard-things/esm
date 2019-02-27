import "./vendor/acorn/acorn/src/expression.js"
import "./vendor/acorn/acorn/src/location.js"
import "./vendor/acorn/acorn/src/lval.js"
import "./vendor/acorn/acorn/src/node.js"
import "./vendor/acorn/acorn/src/scope.js"
import "./vendor/acorn/acorn/src/statement.js"
import "./vendor/acorn/acorn/src/tokencontext.js"
import "./vendor/acorn/acorn/src/tokenize.js"

import {
  lineBreak as lineBreakRegExp,
  skipWhiteSpace as skipWhiteSpaceRegExp
} from "./vendor/acorn/acorn/src/whitespace.js"

import {
  isIdentifierChar,
  isIdentifierStart
} from "./vendor/acorn/acorn/src/identifier.js"

import { Parser } from "./vendor/acorn/acorn/src/state.js"
import { getLineInfo } from "./vendor/acorn/acorn/src/locutil.js"
import { types as tokTypes } from "./vendor/acorn/acorn/src/tokentype.js"

const literalRegExp = /^(?:'((?:\\.|[^'])*?)'|"((?:\\.|[^"])*?)"|;)/

export {
  Parser,
  getLineInfo,
  isIdentifierChar,
  isIdentifierStart,
  lineBreakRegExp,
  literalRegExp,
  skipWhiteSpaceRegExp,
  tokTypes
}

export default {
  Parser,
  getLineInfo,
  lineBreakRegExp,
  literalRegExp,
  skipWhiteSpaceRegExp,
  tokTypes
}
