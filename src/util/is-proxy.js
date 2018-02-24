import binding from "../binding.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"
import { types } from "util"

const _isProxy = types && types.isProxy

function isProxy(value) {
  if (isObjectLike(value)) {
    const { support } = shared

    if (support.isProxy) {
      return _isProxy(value)
    }

    if (support.getProxyDetails) {
      try {
        return binding.util.getProxyDetails(value) !== void 0
      } catch (e) {}
    }
  }

  return false
}

export default isProxy
