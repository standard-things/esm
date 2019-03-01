import "./vendor/acorn/acorn/src/expression.js"
import "./vendor/acorn/acorn/src/location.js"
import "./vendor/acorn/acorn/src/lval.js"
import "./vendor/acorn/acorn/src/node.js"
import "./vendor/acorn/acorn/src/scope.js"
import "./vendor/acorn/acorn/src/statement.js"
import "./vendor/acorn/acorn/src/tokencontext.js"
import "./vendor/acorn/acorn/src/tokenize.js"

import {
  isIdentifierChar,
  isIdentifierStart,
  reservedWords
} from "./vendor/acorn/acorn/src/identifier.js"

import {
  lineBreak as lineBreakRegExp,
  skipWhiteSpace as skipWhiteSpaceRegExp
} from "./vendor/acorn/acorn/src/whitespace.js"

import { Parser } from "./vendor/acorn/acorn/src/state.js"
import { getLineInfo } from "./vendor/acorn/acorn/src/locutil.js"
import { types as tokTypes } from "./vendor/acorn/acorn/src/tokentype.js"
import { wordsRegexp as createWordsRegExp } from "./vendor/acorn/acorn/src/util.js"

const literalRegExp = /^(?:'((?:\\.|[^'])*?)'|"((?:\\.|[^"])*?)"|;)/

export {
  Parser,
  createWordsRegExp,
  getLineInfo,
  isIdentifierChar,
  isIdentifierStart,
  lineBreakRegExp,
  literalRegExp,
  reservedWords,
  skipWhiteSpaceRegExp,
  tokTypes
}

export default {
  Parser,
  createWordsRegExp,
  getLineInfo,
  isIdentifierChar,
  isIdentifierStart,
  lineBreakRegExp,
  literalRegExp,
  reservedWords,
  skipWhiteSpaceRegExp,
  tokTypes
}
