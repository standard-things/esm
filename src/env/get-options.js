import CHAR_CODE from "../constant/char-code.js"

import isPath from "../util/is-path.js"
import parseJSON6 from "../util/parse-json6.js"
import { env } from "../safe/process.js"
import readFile from "../fs/read-file.js"
import { resolve } from "../safe/path.js"
import shared from "../shared.js"

function init() {
  const {
    APOSTROPHE,
    LEFT_CURLY_BRACKET,
    QUOTE
  } = CHAR_CODE

  function getOptions() {
    const ESM_OPTIONS = env && env.ESM_OPTIONS

    if (typeof ESM_OPTIONS !== "string") {
      return null
    }

    let options = ESM_OPTIONS.trim()

    if (isPath(options)) {
      options = readFile(resolve(options), "utf8")

      options = options === null
        ? ""
        : options.trim()
    }

    if (options === "") {
      return null
    }

    const code0 = options.charCodeAt(0)

    if (code0 === APOSTROPHE ||
        code0 === LEFT_CURLY_BRACKET ||
        code0 === QUOTE) {
      options = parseJSON6(options)
    }

    return options
  }

  return getOptions
}

export default shared.inited
  ? shared.module.envGetOptions
  : shared.module.envGetOptions = init()
