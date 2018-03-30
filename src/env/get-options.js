import CHAR_CODE from "../constant/char-code.js"

import isPath from "../util/is-path.js"
import parseJSON6 from "../util/parse-json6.js"
import readFile from "../fs/read-file.js"
import { resolve } from "../safe/path.js"
import shared from "../shared.js"

const {
  APOSTROPHE,
  LBRACE,
  QUOTE
} = CHAR_CODE

function getOptions() {
  const { env } = shared

  if (Reflect.has(env, "options")) {
    return env.options
  }

  const processEnv = process.env

  if (! processEnv ||
      typeof processEnv.ESM_OPTIONS !== "string") {
    return env.options = null
  }

  let ESM_OPTIONS = processEnv.ESM_OPTIONS.trim()

  if (isPath(ESM_OPTIONS)) {
    ESM_OPTIONS = readFile(resolve(ESM_OPTIONS), "utf8")
  }

  if (! ESM_OPTIONS) {
    return env.options = null
  }

  const code0 = ESM_OPTIONS.charCodeAt(0)

  if (code0 === APOSTROPHE ||
      code0 === LBRACE ||
      code0 === QUOTE) {
    ESM_OPTIONS = parseJSON6(ESM_OPTIONS)
  }

  return env.options = ESM_OPTIONS
}

export default getOptions
