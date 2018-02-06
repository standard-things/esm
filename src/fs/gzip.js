import { Gzip } from "minizlib"

import _createOptions from "../util/create-options.js"
import { gzipSync } from "zlib"
import shared from "../shared.js"
import streamToBuffer from "./stream-to-buffer.js"

function gzip(bufferOrString, options) {
  options = gzip.createOptions(options)

  const { fastPath } = shared

  if (fastPath.gzip) {
    try {
      return fastPathGzip(bufferOrString, options)
    } catch (e) {
      fastPath.gzip = false
    }
  }
  return fallbackGzip(bufferOrString, options)
}

function createOptions(options) {
  return _createOptions(options, gzip.defaultOptions)
}

function fallbackGzip(bufferOrString, options) {
  return gzipSync(bufferOrString, options)
}

function fastPathGzip(bufferOrString, options) {
  return streamToBuffer(new Gzip(options), bufferOrString)
}

gzip.defaultOptions = {
  __proto__: null,
  level: 9
}

gzip.createOptions = createOptions

export default gzip
