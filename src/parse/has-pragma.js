// Based on Acorn's Parser.prototype.strictDirective parser utility.
// Copyright Marijn Haverbeke. Released under MIT license:
// https://github.com/ternjs/acorn/blob/5.1.1/src/parseutil.js#L9-L19

import { skipWhiteSpace } from "../vendor/acorn/src/whitespace.js"

const literalRegExp = /^(?:'((?:\\.|[^'])*?)'|"((?:\\.|[^"])*?)"|;)/

const modulePragma = "use module"
const scriptPragma = "use script"

// A pragma width includes the enclosing quotes and trailing semicolon.
const modulePragmaWidth = modulePragma.length + 3
const scriptPragmaWidth = scriptPragma.length + 3

function hasPragma(code, pragma) {
  const index = indexOf(code, pragma)

  if (index === -1) {
    return false
  }

  if (index >= scriptPragmaWidth &&
      pragma === modulePragma) {
    return indexOf(code.slice(0, index), scriptPragma) === -1
  }

  if (index >= modulePragmaWidth &&
      pragma === scriptPragma) {
    return indexOf(code.slice(0, index), modulePragma) === -1
  }

  return true
}

function indexOf(code, pragma) {
  let pos = 0

  while (true) {
    skipWhiteSpace.lastIndex = pos
    pos += skipWhiteSpace.exec(code)[0].length

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

export default hasPragma
