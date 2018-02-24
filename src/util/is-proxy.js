import getProxyDetails from "./get-proxy-details.js"
import shared from "../shared.js"
import { types } from "util"

const _isProxy = types && types.isProxy

function isProxy(value) {
  return shared.support.isProxy
    ? _isProxy(value)
    : getProxyDetails(value) !== void 0
}

export default isProxy
