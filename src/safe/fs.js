import realRequire from "../real/require.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

let safeFs

if (shared.inited) {
  safeFs = shared.module.safeFs
} else {
  safeFs =
  shared.module.safeFs = safe(realRequire("fs"))
  safeFs.Stats = safe(safeFs.Stats)
}

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
