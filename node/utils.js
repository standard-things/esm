"use strict";

const createHash = require("crypto").createHash;
const data = require("./data.js");
const fs = require("fs");
const path = require("path");
const utils = require("../lib/utils.js");
const zlib = require("minizlib");

const FastObject = require("../lib/fast-object.js");
const PkgInfo = require("./pkg-info.js");
const SemVer = require("semver");

const DEFAULT_GZIP_CONFIG = {
  level: 9
};

const DEFAULT_PKG_CONFIG = {
  "cache-directory": ".reify-cache",
  parser: void 0
};

const fsBinding = (() => {
  try {
    return process.binding("fs");
  } catch (e) {}
  return Object.create(null);
})();

const hasOwn = Object.prototype.hasOwnProperty;

const internalModuleReadFile = fsBinding.internalModuleReadFile;
const internalModuleStat = fsBinding.internalModuleStat;
const internalStat = fsBinding.stat;
const internalStatValues = fsBinding.getStatValues;

let useIsDirectoryFastPath = typeof internalModuleStat === "function";
let useReadFileFastPath = typeof internalModuleReadFile === "function";
let useMtimeFastPath = typeof internalStat === "function" &&
  SemVer.satisfies(process.version, "^6.10.1||^7.7");

const maxSatisfyingCache = new FastObject;

let pendingWriteTimer;
const pendingWrites = new FastObject;

const reifyPkgPath = path.join(__dirname, "../package.json");
const reifyVersion = process.env.REIFY_VERSION || readJSON(reifyPkgPath).version;
const reifySemVer = SemVer.parse(reifyVersion);

let statValues;
if (useMtimeFastPath) {
  statValues = typeof internalStatValues === "function"
    ? internalStatValues()
    : new Float64Array(14);
}

function fallbackIsDirectory(filepath) {
  try {
    return fs.statSync(filepath).isDirectory();
  } catch (e) {}
  return false;
}

function fallbackMtime(filepath) {
  try {
    return fs.statSync(filepath).mtime.getTime();
  } catch (e) {}
  return -1;
}

function fallbackReadFile(filepath, options) {
  try {
    return fs.readFileSync(filepath, options);
  } catch (e) {}
  return null;
}

function getReifyRange(json, name) {
  var entry = json[name];
  return utils.isObject(entry) && hasOwn.call(entry, "reify")
    ? SemVer.validRange(entry.reify)
    : null;
}

function streamToBuffer(stream, bufferOrString) {
  const result = [];
  stream.on("data", chunk => result.push(chunk)).end(bufferOrString);
  return Buffer.concat(result);
}

function getCacheFileName(filename, cacheKey, pkgInfo) {
  const ext = typeof filename === "string" ? path.extname(filename) : ".js";

  // Take only the major and minor components of the reify version, so that
  // we don't invalidate the cache every time a patch version is released.
  return createHash("sha1")
    .update(reifySemVer.major + "." + reifySemVer.minor)
    .update("\0")
    .update(utils.toString(filename))
    .update("\0")
    .update(utils.toString(cacheKey))
    .update("\0")
    .update(JSON.stringify(pkgInfo.config))
    .update("\0")
    .digest("hex") + ext;
}

exports.getCacheFileName = getCacheFileName;

function getPkgInfo(dirpath) {
  if (dirpath in data.pkgInfo) {
    return data.pkgInfo[dirpath];
  }

  data.pkgInfo[dirpath] = null;
  if (path.basename(dirpath) === "node_modules") {
    return null;
  }

  const pkgInfo = readPkgInfo(dirpath);
  if (pkgInfo !== null) {
    return data.pkgInfo[dirpath] = pkgInfo;
  }

  const parentPath = path.dirname(dirpath);
  if (parentPath !== dirpath) {
    const pkgInfo = getPkgInfo(parentPath);
    if (pkgInfo !== null) {
      return data.pkgInfo[dirpath] = pkgInfo;
    }
  }

  return null;
}

exports.getPkgInfo = getPkgInfo;

function getReifySemVer() {
  return new SemVer(reifyVersion);
}

exports.getReifySemVer = getReifySemVer;

function gzip(bufferOrString, options) {
  options = Object.assign(Object.create(null), DEFAULT_GZIP_CONFIG, options);
  return streamToBuffer(new zlib.Gzip(options), bufferOrString);
}

exports.gzip = gzip;

function gunzip(bufferOrString, options) {
  options = typeof options === "string" ? { encoding: options } : options;
  options = Object.assign(Object.create(null), options);

  const stream = new zlib.Gunzip(options);
  if (options.encoding !== "utf8") {
    return streamToBuffer(stream, bufferOrString);
  }
  let result = "";
  stream.on("data", chunk => result += chunk).end(bufferOrString);
  return result;
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

function maxSatisfying(versions, range) {
  const cacheKey = versions + "\0" + range;
  if (cacheKey in maxSatisfyingCache) {
    return maxSatisfyingCache[cacheKey];
  }
  return maxSatisfyingCache[cacheKey] = SemVer.maxSatisfying(versions, range);
}

exports.maxSatisfying = maxSatisfying;

function mkdir(dirpath) {
  try {
    fs.mkdirSync(dirpath);
    return true;
  } catch (e) {}
  return false;
}

exports.mkdir = mkdir;

function mkdirp(rootPath, relativePath) {
  const parentPath = path.dirname(relativePath);
  if (parentPath === relativePath) {
    return true;
  }
  if (mkdirp(rootPath, parentPath)) {
    const absolutePath = path.join(rootPath, relativePath);
    return isDirectory(absolutePath) || mkdir(absolutePath);
  }
  return false;
}

exports.mkdirp = mkdirp;

function mtime(filepath) {
  if (useMtimeFastPath) {
    try {
      // Used to speed up file stats. Modifies the `statValues` typed array,
      // with index 11 being the mtime milliseconds stamp. The speedup comes
      // from not creating Stat objects.
      if (useInternalStatValues) {
        internalStat(filepath);
      } else {
        internalStat(filepath, statValues);
      }
      return statValues[11];
    } catch (e) {
      if (e.code === "ENOENT") {
        return -1;
      }
      useMtimeFastPath = false;
    }
  }
  return fallbackMtime(filepath);
}

exports.mtime = mtime;

function readdir(dirpath) {
  try {
    return fs.readdirSync(dirpath);
  } catch (e) {}
  return null;
}

exports.readdir = readdir;

function readFile(filepath, options) {
  const encoding = utils.isObject(options) ? options.encoding : options;

  if (useReadFileFastPath && encoding === "utf8") {
    try {
      // Used to speed up reading. Returns the contents of the file as a string
      // or undefined when the file cannot be opened. The speedup comes from not
      // creating Error objects on failure.
      const content = internalModuleReadFile(filepath);
      return content === void 0 ? null : content;
    } catch (e) {
      useReadFileFastPath = false;
    }
  }
  return fallbackReadFile(filepath, options);
}

exports.readFile = readFile;

function readJSON(filepath) {
  const content = readFile(filepath, "utf8");
  return content === null ? content : JSON.parse(content);
}

exports.readJSON = readJSON;

function readPkgInfo(dirpath) {
  const pkgPath = path.join(dirpath, "package.json");
  const pkgJSON = readJSON(pkgPath);

  if (pkgJSON === null) {
    return null;
  }

  const reify = pkgJSON.reify;

  if (reify === false) {
    // An explicit "reify": false property in package.json disables
    // reification even if "reify" is listed as a dependency.
    return null;
  }

  const range =
    getReifyRange(pkgJSON, "dependencies") ||
    getReifyRange(pkgJSON, "peerDependencies") ||
    getReifyRange(pkgJSON, "devDependencies");

  // Use case: a package.json file may have "reify" in its "devDependencies"
  // object because it expects another package or application to enable
  // reification in production, but needs its own copy of the "reify" package
  // during development. Disabling reification in production when it was enabled
  // in development would be undesired in this case.
  if (range === null) {
    return null;
  }

  const config = Object.assign(Object.create(null), DEFAULT_PKG_CONFIG, reify);
  const cacheDir = config["cache-directory"];
  const cachePath = typeof cacheDir === "string" ? path.join(dirpath, cacheDir) : null;
  const cacheFiles = cachePath === null ? null : readdir(cachePath);

  const pkgInfo = new PkgInfo;
  pkgInfo.cachePath = cachePath;
  pkgInfo.config = config;
  pkgInfo.range = range;

  const fileCount = cacheFiles === null ? 0 : cacheFiles.length;

  for (let i = 0; i < fileCount; ++i) {
    // Later, in Module._extensions[".js"], we'll change the value to the actual
    // contents of the file, but for now we merely register that it exists.
    pkgInfo.cache[cacheFiles[i]] = true;
  }
  return pkgInfo;
}

exports.readPkgInfo = readPkgInfo;

function scheduleWrite(rootPath, relativePath, content) {
  const filepath = path.join(rootPath, relativePath);
  pendingWrites[filepath] = { content, rootPath, relativePath };
  pendingWriteTimer = pendingWriteTimer || setImmediate(() => {
    pendingWriteTimer = null;
    Object.keys(pendingWrites).forEach((filepath) => {
      const pending = pendingWrites[filepath];

      if (mkdirp(pending.rootPath, path.dirname(pending.relativePath))) {
        if (path.extname(filepath) === ".gz"
            ? writeFile(filepath, gzip(pending.content))
            : writeFile(filepath, pending.content, "utf8")) {
          delete pendingWrites[filepath];
        }
      }
    });
  });
}

exports.scheduleWrite = scheduleWrite;

function writeFile(filepath, bufferOrString, options) {
  try {
    fs.writeFileSync(filepath, bufferOrString, options);
    return true;
  } catch (e) {}
  return false;
}

exports.writeFile = writeFile;
