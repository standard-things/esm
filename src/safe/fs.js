import realFs from "../real/fs.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeFs = safe(realFs)
  const { native } = safeFs.realpathSync

  if (typeof native === "function") {
    setProperty(safeFs, "realpathNativeSync", native)
  }

  setProperty(safeFs, "Stats", safe(safeFs.Stats))

  return safeFs
}

const safeFs = shared.inited
  ? shared.module.safeFs
  : shared.module.safeFs = init()

export const {
  mkdirSync,
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
