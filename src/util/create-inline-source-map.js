import createSourceMap from "./create-source-map.js"
import encodeURI from "./encode-uri.js"
import shared from "../shared.js"

function init() {
  function createInlineSourceMap(filename, content) {
    const sourceMap = createSourceMap(filename, content)

    if (sourceMap === "") {
      return sourceMap
    }

    return "//# sourceMappingURL=data:application/json;charset=utf-8," +
      encodeURI(sourceMap)
  }

  return createInlineSourceMap
}

export default shared.inited
  ? shared.module.utilCreateInlineSourceMap
  : shared.module.utilCreateInlineSourceMap = init()
