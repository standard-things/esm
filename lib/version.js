import fs from "./fs.js"
import path from "path"
import SemVer from "semver"

const dirname = path.dirname(__non_webpack_module__.filename)
const pkgPath = path.join(dirname, "package.json")

export default new SemVer(
  process.env.ESM_VERSION || fs.readJSON(pkgPath).version
)
