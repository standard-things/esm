import CHARS from "../chars.js"

const {
  ZWJ
} = CHARS

function encodeId(id) {
  return id + ZWJ
}

export default encodeId
