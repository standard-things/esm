import pad from "./pad.js"

function overwrite(visitor, oldStart, oldEnd, newCode) {
  const { magicString } = visitor
  const padded = pad(magicString.original, newCode, oldStart, oldEnd)

  if (oldStart !== oldEnd) {
    magicString.overwrite(oldStart, oldEnd, padded)
  } else if (padded !== "") {
    magicString.prependLeft(oldStart, padded)
  }
}

export default overwrite
