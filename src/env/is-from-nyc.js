import has from "../util/has.js"
import normalize from "../path/normalize.js"
import readJSON from "../fs/read-json.js"
import shared from "../shared.js"

function isFromNyc() {
  const { env } = shared

  if ("isFromNyc" in env) {
    return env.isFromNyc
  }

  const { parent } = __non_webpack_module__
  const parentFilename = parent && normalize(parent.filename)

  const nycIndex = parentFilename
    ? parentFilename.lastIndexOf("/node_modules/nyc/")
    : -1

  const nycJSON = nycIndex === -1
    ? null
    : readJSON(parentFilename.slice(0, nycIndex + 18) + "package.json")

  return env.isFromNyc =
    has(nycJSON, "name") &&
    nycJSON.name === "nyc"
}

export default isFromNyc
