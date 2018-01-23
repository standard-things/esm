import has from "../util/has.js"
import normalize from "../path/normalize.js"
import readJSON from "../fs/read-json.js"
import shared from "../shared.js"

function isFromNyc() {
  if ("isFromNyc" in shared.env) {
    return shared.env.isFromNyc
  }

  const { parent } = __non_webpack_module__
  const parentFilePath = parent && normalize(parent.filename)

  const nycIndex = parentFilePath
    ? parentFilePath.lastIndexOf("/node_modules/nyc/")
    : -1

  const nycJSON = nycIndex === -1
    ? null
    : readJSON(parentFilePath.slice(0, nycIndex + 18) + "package.json")

  return shared.env.isFromNyc =
    has(nycJSON, "name") &&
    nycJSON.name === "nyc"
}

export default isFromNyc
