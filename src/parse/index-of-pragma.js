// Based on `strictDirective()`.
// Copyright Marijn Haverbeke. Released under MIT license:
// https://github.com/acornjs/acorn

import { literalRegExp, skipWhiteSpaceRegExp } from "../acorn.js"

import shared from "../shared.js"

function init() {
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

  return indexOfPragma
}

export default shared.inited
  ? shared.module.parseIndexOfPragma
  : shared.module.parseIndexOfPragma = init()
