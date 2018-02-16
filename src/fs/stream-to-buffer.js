import GenericArray from "../generic/array.js"
import GenericBuffer from "../generic/buffer.js"

function streamToBuffer(stream, bufferOrString) {
  const result = []

  stream.on("data", (chunk) => {
    GenericArray.push(result, chunk)
  }).end(bufferOrString)

  return GenericBuffer.concat(result)
}

export default streamToBuffer
