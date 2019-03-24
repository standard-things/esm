import {
  closeSync,
  constants,
  futimesSync,
  openSync
} from "../safe/fs.js"

import shared from "../shared.js"

function init() {
  const {
    O_RDWR
  } = constants

  function touch(filename, timestamp = Date.now()) {
    try {
      const fd = openSync(filename, O_RDWR)

      futimesSync(fd, timestamp, timestamp)
      closeSync(fd)

      return true
    } catch {}

    return false
  }

  return touch
}

export default shared.inited
  ? shared.module.fsTouch
  : shared.module.fsTouch = init()
