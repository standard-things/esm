import createOptions from "../util/create-options.js"
import minizlib from "minizlib"
import streamToBuffer from "./stream-to-buffer.js"
import zlib from "zlib"

let useGunzipFastPath = true

function gunzip(bufferOrString, options) {
  options = typeof options === "string" ? { encoding: options } : options
  options = createOptions(options)

  if (useGunzipFastPath) {
    try {
      return fastPathGunzip(bufferOrString, options)
    } catch (e) {
      useGunzipFastPath = false
    }
  }
  return fallbackGunzip(bufferOrString, options)
}

function fallbackGunzip(bufferOrString, options) {
  const buffer = zlib.gunzipSync(bufferOrString, options)
  return options.encoding === "utf8" ? buffer.toString() : buffer
}

function fastPathGunzip(bufferOrString, options) {
  const stream = new minizlib.Gunzip(options)

  if (options.encoding === "utf8") {
    let result = ""
    stream.on("data", (chunk) => result += chunk).end(bufferOrString)
    return result
  }

  return streamToBuffer(stream, bufferOrString)
}

export default gunzip
