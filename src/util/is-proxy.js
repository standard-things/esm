import binding from "../binding.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"
import { types } from "util"

const _isProxy = shared.support.isProxy
  ? types.isProxy
  : null

function isProxy(value) {
  if (_isProxy) {
    return _isProxy(value)
  }

  if (isObjectLike(value) &&
      shared.support.getProxyDetails) {
    try {
      return binding.util.getProxyDetails(value) !== void 0
    } catch (e) {}
  }

  return false
}

export default isProxy
