const ZWJ = "\u200d"

function encodeId(id) {
  return id + ZWJ
}

export default encodeId
