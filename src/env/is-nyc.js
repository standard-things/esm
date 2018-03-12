import ESM from "../constant/esm.js"

import has from "../util/has.js"
import normalize from "../path/normalize.js"
import readJSON from "../fs/read-json.js"
import shared from "../shared.js"

const {
  PKG_PARENT
} = ESM

function isNyc() {
  const { env } = shared

  if (Reflect.has(env, "nyc")) {
    return env.nyc
  }

  const parentFilename = PKG_PARENT && normalize(PKG_PARENT.filename)

  const nycIndex = parentFilename
    ? parentFilename.lastIndexOf("/node_modules/nyc/")
    : -1

  if (nycIndex === -1) {
    return env.nyc = false
  }

  const nycPath = parentFilename.slice(0, nycIndex + 18) + "package.json"
  const nycJSON = readJSON(nycPath)

  return env.nyc =
    has(nycJSON, "name") &&
    nycJSON.name === "nyc"
}

export default isNyc
