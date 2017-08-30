import { Gzip } from "minizlib"

import createOptions from "../util/create-options.js"
import { gzipSync } from "zlib"
import streamToBuffer from "./stream-to-buffer.js"

const defaultOptions = createOptions({
  level: 9
})

let useGzipFastPath = true

function gzip(bufferOrString, options) {
  options = createOptions(options, defaultOptions)

  if (useGzipFastPath) {
    try {
      return fastPathGzip(bufferOrString, options)
    } catch (e) {
      useGzipFastPath = false
    }
  }
  return fallbackGzip(bufferOrString, options)
}

function fallbackGzip(bufferOrString, options) {
  return gzipSync(bufferOrString, options)
}

function fastPathGzip(bufferOrString, options) {
  return streamToBuffer(new Gzip(options), bufferOrString)
}

gzip.defaultOptions = defaultOptions

export default gzip
