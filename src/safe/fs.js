import realRequire from "../real/require.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

function init() {
  const safeFs = safe(realRequire("fs"))

  safeFs.Stats = safe(safeFs.Stats)
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
  Stats,
  statSync,
  unlinkSync,
  writeFileSync
} = safeFs

export default safeFs
