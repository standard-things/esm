import CHAR from "../constant/char.js"

const {
  ZERO_WIDTH_NOBREAK_SPACE
} = CHAR

function encodeId(id) {
  return id + ZERO_WIDTH_NOBREAK_SPACE
}

export default encodeId
