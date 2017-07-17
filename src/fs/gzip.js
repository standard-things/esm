import createOptions from "../util/create-options.js"
import minizlib from "minizlib"
import streamToBuffer from "./stream-to-buffer.js"
import zlib from "zlib"

const defaultOptions = {
  level: 9
}

let useGzipFastPath = true

function gzip(bufferOrString, options) {
  options = createOptions(options, defaultOptions)

  if (useGzipFastPath) {
    try {
      return streamToBuffer(new minizlib.Gzip(options), bufferOrString)
    } catch (e) {
      useGzipFastPath = false
    }
  }
  return fallbackGzip(bufferOrString, options)
}

function fallbackGzip(bufferOrString, options) {
  return zlib.gzipSync(bufferOrString, options)
}

export default gzip
