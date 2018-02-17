// Based on Acorn's Parser.prototype.strictDirective parser utility.
// Copyright Marijn Haverbeke. Released under MIT license:
// https://github.com/ternjs/acorn/blob/5.1.1/src/parseutil.js#L9-L19

import { literalRegExp, skipWhiteSpaceRegExp } from "../acorn.js"

import GenericRegExp from "../generic/regexp.js"
import GenericString from "../generic/string.js"

function indexOfPragma(code, pragma) {
  let pos = 0

  while (true) {
    skipWhiteSpaceRegExp.lastIndex = pos
    pos += GenericRegExp.exec(skipWhiteSpaceRegExp, code)[0].length

    const match = GenericRegExp.exec(literalRegExp, GenericString.slice(code, pos))

    if (match === null) {
      return -1
    }

    if ((match[1] || match[2]) === pragma) {
      return pos
    }

    pos += match[0].length
  }
}

export default indexOfPragma
