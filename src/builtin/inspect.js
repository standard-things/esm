import inspect from "../util/inspect.js"
import proxyWrap from "../util/proxy-wrap.js"
import safeUtil from "../safe/util.js"
import toWrapper from "../util/to-wrapper.js"

const builtinInspect = proxyWrap(safeUtil.inspect, toWrapper(inspect))

export default builtinInspect
