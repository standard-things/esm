import overwrite from "./overwrite.js"

function preserveLine(visitor, { end, start }) {
  overwrite(visitor, start, end, "")
}

export default preserveLine
