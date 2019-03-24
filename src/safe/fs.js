import realFs from "../real/fs.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeFs = safe(realFs)
  const { native } = safeFs.realpathSync

  const realpathNativeSync = typeof native === "function"
    ? native
    : void 0

  setProperty(safeFs, "constants", safe(safeFs.constants))
  setProperty(safeFs, "realpathNativeSync", realpathNativeSync)
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
  realpathNativeSync,
  Stats,
  statSync,
  unlinkSync,
  writeFileSync
} = safeFs

export default safeFs
