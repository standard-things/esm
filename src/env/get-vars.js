import NullObject from "../null-object.js"

import isPath from "../util/is-path.js"
import parseJSON6 from "../util/parse-json6.js"
import readFile from "../fs/read-file.js"
import { resolve } from "path"
import shared from "../shared.js"

function getVars() {
  if ("getVars" in shared.env) {
    return shared.env.getVars
  }

  const vars = new NullObject

  if (! process.env ||
      typeof process.env.ESM_OPTIONS !== "string") {
    return shared.env.getVars = vars
  }

  let ESM_OPTIONS = process.env.ESM_OPTIONS.trim()

  if (isPath(ESM_OPTIONS)) {
    ESM_OPTIONS = readFile(resolve(ESM_OPTIONS), "utf8")
  }

  if (! ESM_OPTIONS) {
    return shared.env.getVars = vars
  }

  const codeOfDoubleQuote = '"'.charCodeAt(0)
  const codeOfLeftBracket = "{".charCodeAt(0)
  const codeOfSingleQuote = "'".charCodeAt(0)
  const code0 = ESM_OPTIONS.charCodeAt(0)

  if (code0 === codeOfLeftBracket ||
      code0 === codeOfDoubleQuote ||
      code0 === codeOfSingleQuote) {
    ESM_OPTIONS = parseJSON6(ESM_OPTIONS)
  }

  vars.ESM_OPTIONS = ESM_OPTIONS
  return shared.env.getVars = vars
}

export default getVars
