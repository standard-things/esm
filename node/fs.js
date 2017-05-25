"use strict";

const fs = require("fs");
const minizlib = require("minizlib");
const path = require("path");
const utils = require("../lib/utils.js");
const zlib = require("zlib");

const FastObject = require("../lib/fast-object.js");
const SemVer = require("semver");

const DEFAULT_GZIP_CONFIG = {
  level: 9
};

const fsBinding = (() => {
  try {
    return process.binding("fs");
  } catch (e) {}
  return Object.create(null);
})();

const internalModuleReadFile = fsBinding.internalModuleReadFile;
const internalModuleStat = fsBinding.internalModuleStat;
const internalStat = fsBinding.stat;
const internalStatValues = fsBinding.getStatValues;

let useGzipFastPath = true;
let useGunzipFastPath = true;
let useIsDirectoryFastPath = typeof internalModuleStat === "function";
let useReadFileFastPath = typeof internalModuleReadFile === "function";
let useMtimeFastPath = typeof internalStat === "function" &&
  SemVer.satisfies(process.version, "^6.10.1||^7.7");

let pendingWriteTimer = null;
const pendingWrites = new FastObject;

let statValues;
if (useMtimeFastPath) {
  statValues = typeof internalStatValues === "function"
    ? internalStatValues()
    : new Float64Array(14);
}

function fallbackIsDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (e) {}
  return false;
}

function fallbackMtime(filePath) {
  try {
    return fs.statSync(filePath).mtime.getTime();
  } catch (e) {}
  return -1;
}

function fallbackReadFile(filePath, options) {
  try {
    return fs.readFileSync(filePath, options);
  } catch (e) {}
  return null;
}

function streamToBuffer(stream, bufferOrString) {
  const result = [];
  stream.on("data", chunk => result.push(chunk)).end(bufferOrString);
  return Buffer.concat(result);
}

function gzip(bufferOrString, options) {
  options = Object.assign(Object.create(null), DEFAULT_GZIP_CONFIG, options);

  if (useGzipFastPath) {
    try {
      return streamToBuffer(new minizlib.Gzip(options), bufferOrString);
    } catch (e) {
      useGzipFastPath = false;
    }
  }
  return zlib.gzipSync(bufferOrString, options);
}

exports.gzip = gzip;

function gunzip(bufferOrString, options) {
  options = typeof options === "string" ? { encoding: options } : options;
  options = Object.assign(Object.create(null), options);

  if (useGunzipFastPath) {
    try {
      const stream = new minizlib.Gunzip(options);
      if (options.encoding === "utf8") {
        let result = "";
        stream.on("data", chunk => result += chunk).end(bufferOrString);
        return result;
      }
      return streamToBuffer(stream, bufferOrString);
    } catch (e) {
      useGunzipFastPath = false;
    }
  }

  const buffer = zlib.gunzipSync(bufferOrString, options);
  return options.encoding === "utf8" ? buffer.toString() : buffer;
}

exports.gunzip = gunzip;

function isDirectory(thepath) {
  if (useIsDirectoryFastPath) {
    try {
      // Used to speed up loading. Returns 0 if the path refers to a file,
      // 1 when it's a directory or < 0 on error (usually ENOENT). The speedup
      // comes from not creating thousands of Stat and Error objects.
      return internalModuleStat(thepath) === 1;
    } catch (e) {
      useIsDirectoryFastPath = false;
    }
  }
  return fallbackIsDirectory(thepath);
}

exports.isDirectory = isDirectory;

function mkdir(dirPath) {
  try {
    fs.mkdirSync(dirPath);
    return true;
  } catch (e) {}
  return false;
}

exports.mkdir = mkdir;

function mkdirp(dirPath, scopePath) {
  const parentPath = path.dirname(dirPath);
  if (dirPath === parentPath || dirPath === scopePath) {
    return true;
  }
  if (mkdirp(parentPath, scopePath)) {
    return isDirectory(dirPath) || mkdir(dirPath);
  }
  return false;
}

exports.mkdirp = mkdirp;

function mtime(filePath) {
  if (useMtimeFastPath) {
    try {
      // Used to speed up file stats. Modifies the `statValues` typed array,
      // with index 11 being the mtime milliseconds stamp. The speedup comes
      // from not creating Stat objects.
      if (useInternalStatValues) {
        internalStat(filePath);
      } else {
        internalStat(filePath, statValues);
      }
      return statValues[11];
    } catch (e) {
      if (e.code === "ENOENT") {
        return -1;
      }
      useMtimeFastPath = false;
    }
  }
  return fallbackMtime(filePath);
}

exports.mtime = mtime;

function readdir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch (e) {}
  return null;
}

exports.readdir = readdir;

function readFile(filePath, options) {
  const encoding = utils.isObject(options) ? options.encoding : options;

  if (useReadFileFastPath && encoding === "utf8") {
    try {
      // Used to speed up reading. Returns the contents of the file as a string
      // or undefined when the file cannot be opened. The speedup comes from not
      // creating Error objects on failure.
      const content = internalModuleReadFile(filePath);
      return content === void 0 ? null : content;
    } catch (e) {
      useReadFileFastPath = false;
    }
  }
  return fallbackReadFile(filePath, options);
}

exports.readFile = readFile;

function readJSON(filePath) {
  const content = readFile(filePath, "utf8");
  return content === null ? content : JSON.parse(content);
}

exports.readJSON = readJSON;

function writeFile(filePath, bufferOrString, options) {
  try {
    fs.writeFileSync(filePath, bufferOrString, options);
    return true;
  } catch (e) {}
  return false;
}

exports.writeFile = writeFile;

function writeFileDefer(filePath, content, options) {
  options = Object.assign({}, options);
  pendingWrites[filePath] = { content, options };

  if (pendingWriteTimer !== null) {
    return;
  }
  pendingWriteTimer = setImmediate(() => {
    pendingWriteTimer = null;
    Object.keys(pendingWrites).forEach((filePath) => {
      const pending = pendingWrites[filePath];

      if (mkdirp(path.dirname(filePath), pending.options.scopePath)) {
        const content = typeof pending.content === "function"
          ? pending.content()
          : pending.content;

        if (writeFile(filePath, content, pending.options)) {
          delete pendingWrites[filePath];
        }
      }
    });
  });
}

exports.writeFileDefer = writeFileDefer;
