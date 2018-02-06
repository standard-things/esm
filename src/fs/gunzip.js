import { Gunzip } from "minizlib"

import createOptions from "../util/create-options.js"
import { gunzipSync } from "zlib"
import shared from "../shared.js"
import streamToBuffer from "./stream-to-buffer.js"

function gunzip(bufferOrString, options) {
  options = typeof options === "string" ? { encoding: options } : options
  options = createOptions(options)

  const { fastPath } = shared

  if (fastPath.gunzip) {
    try {
      return fastPathGunzip(bufferOrString, options)
    } catch (e) {
      fastPath.gunzip = false
    }
  }
  return fallbackGunzip(bufferOrString, options)
}

function fallbackGunzip(bufferOrString, options) {
  const buffer = gunzipSync(bufferOrString, options)
  return options.encoding === "utf8" ? buffer.toString() : buffer
}

function fastPathGunzip(bufferOrString, options) {
  const stream = new Gunzip(options)

  if (options.encoding === "utf8") {
    let result = ""
    stream.on("data", (chunk) => result += chunk).end(bufferOrString)
    return result
  }

  return streamToBuffer(stream, bufferOrString)
}

export default gunzip
