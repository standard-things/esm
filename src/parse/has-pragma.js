import indexOfPragma from "./index-of-pragma.js"

const modulePragma = "use module"
const scriptPragma = "use script"

// A pragma width includes the enclosing quotes and trailing semicolon.
const modulePragmaWidth = modulePragma.length + 3
const scriptPragmaWidth = scriptPragma.length + 3

function hasPragma(code, pragma) {
  const index = indexOfPragma(code, pragma)

  if (index === -1) {
    return false
  }

  if (index >= scriptPragmaWidth &&
      pragma === modulePragma) {
    return indexOfPragma(code.slice(0, index), scriptPragma) === -1
  }

  if (index >= modulePragmaWidth &&
      pragma === scriptPragma) {
    return indexOfPragma(code.slice(0, index), modulePragma) === -1
  }

  return true
}

export default hasPragma
