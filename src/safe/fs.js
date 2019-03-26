import has from "../util/has.js"
import realFs from "../real/fs.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeFs = safe(realFs)
  const { native } = safeFs.realpathSync

  if (typeof native === "function") {
    shared.realpathNativeSync = native
  }

  if (has(safeFs, "constants")) {
    setProperty(safeFs, "constants", safe(safeFs.constants))
  }

  setProperty(safeFs, "Stats", safe(safeFs.Stats))

  return safeFs
}

const safeFs = shared.inited
  ? shared.module.safeFs
  : shared.module.safeFs = init()

export const {
  closeSync,
  constants,
  futimesSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  Stats,
  statSync,
  unlinkSync,
  writeFileSync
} = safeFs

export default safeFs
