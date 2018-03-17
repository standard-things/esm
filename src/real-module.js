import realRequire from "./real-require.js"
import shared from "./shared.js"

export default shared.inited
  ? shared.RealModule
  : shared.RealModule = realRequire("module")
