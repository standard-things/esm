import realRequire from "./require.js"
import shared from "../shared.js"

export default shared.inited
  ? shared.module.realProcess
  : shared.module.realProcess = realRequire("process")
