import GenericBuffer from "../generic/buffer.js"

function streamToBuffer(stream, bufferOrString) {
  const result = []

  stream.on("data", (chunk) => {
    result.push(chunk)
  }).end(bufferOrString)

  return GenericBuffer.concat(result)
}

export default streamToBuffer
