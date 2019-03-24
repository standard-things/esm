import isObjectLike from "../util/is-object-like.js"
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

  let { constants } = safeFs

  if (isObjectLike(constants)) {
    constants = safe(constants)
  } else {
    constants = { O_RDWR: 2 }
  }

  setProperty(safeFs, "constants", constants)
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
