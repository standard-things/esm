import CHAR_CODES from "../char-codes.js"

import isPath from "../util/is-path.js"
import parseJSON6 from "../util/parse-json6.js"
import readFile from "../fs/read-file.js"
import { resolve } from "path"
import shared from "../shared.js"

const {
  APOSTROPHE,
  LBRACE,
  QUOTE
} = CHAR_CODES

function getVars() {
  const { env } = shared

  if ("vars" in env) {
    return env.vars
  }

  const processEnv = process.env
  const vars = { __proto__: null }

  if (! processEnv ||
      typeof processEnv.ESM_OPTIONS !== "string") {
    return env.vars = vars
  }

  let ESM_OPTIONS = processEnv.ESM_OPTIONS.trim()

  if (isPath(ESM_OPTIONS)) {
    ESM_OPTIONS = readFile(resolve(ESM_OPTIONS), "utf8")
  }

  if (! ESM_OPTIONS) {
    return env.vars = vars
  }

  const code0 = ESM_OPTIONS.charCodeAt(0)

  if (code0 === APOSTROPHE ||
      code0 === LBRACE ||
      code0 === QUOTE) {
    ESM_OPTIONS = parseJSON6(ESM_OPTIONS)
  }

  vars.ESM_OPTIONS = ESM_OPTIONS
  return env.vars = vars
}

export default getVars
