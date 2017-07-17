export default function streamToBuffer(stream, bufferOrString) {
  const result = []
  stream.on("data", (chunk) => result.push(chunk)).end(bufferOrString)
  return Buffer.concat(result)
}
