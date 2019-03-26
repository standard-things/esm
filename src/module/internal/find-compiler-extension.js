import has from "../../util/has.js"
import shared from "../../shared.js"

function init() {
  function findCompilerExtension(extCompilers, entry) {
    const {
      basename,
      extname,
      filename
    } = entry

    if (extname === "") {
      return extname
    }

    const extIndex = filename.length - extname.length

    let index
    let fromIndex = 0

    while ((index = basename.indexOf(".", fromIndex)) !== -1) {
      fromIndex = index + 1

      if (index === 0) {
        continue
      }

      const done = index === extIndex

      const ext = done
        ? extname
        : basename.slice(index)

      if (has(extCompilers, ext)) {
        return ext
      }

      if (done) {
        break
      }
    }

    return ""
  }

  return findCompilerExtension
}

export default shared.inited
  ? shared.module.moduleInternalFindCompilerExtension
  : shared.module.moduleInternalFindCompilerExtension = init()
