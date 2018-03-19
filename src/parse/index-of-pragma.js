// Based on Acorn's `strictDirective`.
// Copyright Marijn Haverbeke. Released under MIT license:
// https://github.com/acornjs/acorn

import { literalRegExp, skipWhiteSpaceRegExp } from "../acorn.js"

function indexOfPragma(code, pragma) {
  let pos = 0

  while (true) {
    skipWhiteSpaceRegExp.lastIndex = pos
    pos += skipWhiteSpaceRegExp.exec(code)[0].length

    const match = literalRegExp.exec(code.slice(pos))

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
