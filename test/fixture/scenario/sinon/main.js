import { log } from "console"
import sinon from "sinon"
import * as util from "./util.js"

sinon.stub(util, "getPricing").returns(Promise.resolve(true))

util.getPricing()
  .then((actual) => log("sinon:" + actual))
