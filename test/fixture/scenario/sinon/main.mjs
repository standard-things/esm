import { log } from "console"
import sinon from "sinon"
import * as util from "./util.mjs"

try {
  sinon.stub(util, "getPricing")
} catch (e) {
  log(e)
}
