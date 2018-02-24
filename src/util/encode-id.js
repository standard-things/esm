import CHAR from "../constant/char.js"

const {
  ZWJ
} = CHAR

function encodeId(id) {
  return id + ZWJ
}

export default encodeId
