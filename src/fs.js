import FastObject from "./fast-object.js"
import fs from "fs"
import minizlib from "minizlib"
import path from "path"
import SemVer from "semver"
import zlib from "zlib"

const DEFAULT_GZIP_CONFIG = {
  level: 9
}

const fsBinding = (() => {
  try {
    return process.binding("fs")
  } catch (e) {}
  return Object.create(null)
})()

const internalModuleReadFile = fsBinding.internalModuleReadFile
const internalModuleStat = fsBinding.internalModuleStat
const internalStat = fsBinding.stat
const internalStatValues = fsBinding.getStatValues

let pendingWriteTimer = null
const pendingWrites = new FastObject

let useGzipFastPath = true
let useGunzipFastPath = true
let useIsDirectoryFastPath = typeof internalModuleStat === "function"
let useReadFileFastPath = typeof internalModuleReadFile === "function"
let useMtimeFastPath = typeof internalStat === "function" &&
  SemVer.satisfies(process.version, "^6.10.1||>=7.7")

let statValues
const useInternalStatValues = typeof internalStatValues === "function"

if (useMtimeFastPath) {
  statValues = useInternalStatValues
    ? internalStatValues()
    : new Float64Array(14)
}

class FS {
  static gzip(bufferOrString, options) {
    options = Object.assign(Object.create(null), DEFAULT_GZIP_CONFIG, options)

    if (useGzipFastPath) {
      try {
        return streamToBuffer(new minizlib.Gzip(options), bufferOrString)
      } catch (e) {
        useGzipFastPath = false
      }
    }
    return fallbackGzip(bufferOrString, options)
  }

  static gunzip(bufferOrString, options) {
    options = typeof options === "string" ? { encoding: options } : options
    options = Object.assign(Object.create(null), options)

    if (useGunzipFastPath) {
      try {
        const stream = new minizlib.Gunzip(options)
        if (options.encoding === "utf8") {
          let result = ""
          stream.on("data", (chunk) => result += chunk).end(bufferOrString)
          return result
        }
        return streamToBuffer(stream, bufferOrString)
      } catch (e) {
        useGunzipFastPath = false
      }
    }
    return fallbackGunzip(bufferOrString, options)
  }

  static isDirectory(thepath) {
    if (useIsDirectoryFastPath) {
      try {
        // Used to speed up loading. Returns 0 if the path refers to a file,
        // 1 when it's a directory or < 0 on error (usually ENOENT). The speedup
        // comes from not creating thousands of Stat and Error objects.
        return internalModuleStat(thepath) === 1
      } catch (e) {
        useIsDirectoryFastPath = false
      }
    }
    return fallbackIsDirectory(thepath)
  }

  static mkdir(dirPath) {
    try {
      fs.mkdirSync(dirPath)
      return true
    } catch (e) {}
    return false
  }

  static mkdirp(dirPath, scopePath) {
    const parentPath = path.dirname(dirPath)
    if (dirPath === parentPath || dirPath === scopePath) {
      return true
    }
    if (FS.mkdirp(parentPath, scopePath)) {
      return FS.isDirectory(dirPath) || FS.mkdir(dirPath)
    }
    return false
  }

  static mtime(filePath) {
    if (useMtimeFastPath) {
      try {
        // Used to speed up file stats. Modifies the `statValues` typed array,
        // with index 11 being the mtime milliseconds stamp. The speedup comes
        // from not creating Stat objects.
        if (useInternalStatValues) {
          internalStat(filePath)
        } else {
          internalStat(filePath, statValues)
        }
        return statValues[11]
      } catch (e) {
        if (e.code === "ENOENT") {
          return -1
        }
        useMtimeFastPath = false
      }
    }
    return fallbackMtime(filePath)
  }

  static readdir(dirPath) {
    try {
      return fs.readdirSync(dirPath)
    } catch (e) {}
    return null
  }

  static readFile(filePath, options) {
    const encoding = typeof options === "object" && options !== null
      ? options.encoding
      : options

    if (useReadFileFastPath && encoding === "utf8") {
      try {
        // Used to speed up reading. Returns the contents of the file as a string
        // or undefined when the file cannot be opened. The speedup comes from not
        // creating Error objects on failure.
        const content = internalModuleReadFile(filePath)
        return content === void 0 ? null : content
      } catch (e) {
        useReadFileFastPath = false
      }
    }
    return fallbackReadFile(filePath, options)
  }

  static readJSON(filePath) {
    const content = FS.readFile(filePath, "utf8")
    return content === null ? content : JSON.parse(content)
  }

  static removeFile(filePath) {
    try {
      fs.unlinkSync(filePath)
      return true
    } catch (e) {}
    return false
  }

  static writeFile(filePath, bufferOrString, options) {
    try {
      fs.writeFileSync(filePath, bufferOrString, options)
      return true
    } catch (e) {}
    return false
  }

  static writeFileDefer(filePath, content, options, callback) {
    options = Object.assign(Object.create(null), options)
    pendingWrites[filePath] = { callback, content, options }

    if (pendingWriteTimer !== null) {
      return
    }
    pendingWriteTimer = setImmediate(() => {
      pendingWriteTimer = null
      Object.keys(pendingWrites).forEach((filePath) => {
        const pending = pendingWrites[filePath]
        const callback = pending.callback
        const options = pending.options
        let success = false

        if (FS.mkdirp(path.dirname(filePath), options.scopePath)) {
          const content = typeof pending.content === "function"
            ? pending.content()
            : pending.content

          success = FS.writeFile(filePath, content, options)
        }

        if (success) {
          delete pendingWrites[filePath]
        }

        if (typeof callback === "function") {
          callback(success)
        }
      })
    })
  }
}

function fallbackGzip(bufferOrString, options) {
  return zlib.gzipSync(bufferOrString, options)
}

function fallbackGunzip(bufferOrString, options) {
  const buffer = zlib.gunzipSync(bufferOrString, options)
  return options.encoding === "utf8" ? buffer.toString() : buffer
}

function fallbackIsDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory()
  } catch (e) {}
  return false
}

function fallbackMtime(filePath) {
  try {
    return fs.statSync(filePath).mtime.getTime()
  } catch (e) {}
  return -1
}

function fallbackReadFile(filePath, options) {
  try {
    return fs.readFileSync(filePath, options)
  } catch (e) {}
  return null
}

function streamToBuffer(stream, bufferOrString) {
  const result = []
  stream.on("data", (chunk) => result.push(chunk)).end(bufferOrString)
  return Buffer.concat(result)
}

Object.setPrototypeOf(FS.prototype, null)

export default FS
