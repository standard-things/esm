"use strict";

const createHash = require("crypto").createHash;
const data = require("./data.js");
const fs = require("./fs.js");
const path = require("path");
const utils = require("../lib/utils.js");

const FastObject = require("../lib/fast-object.js");
const PkgInfo = require("./pkg-info.js");
const SemVer = require("semver");

const DEFAULT_PKG_CONFIG = {
  "cache-directory": ".reify-cache",
  parser: void 0
};

const hasOwn = Object.prototype.hasOwnProperty;
const maxSatisfyingCache = new FastObject;
const reifySemVer = require("./version.js");

function getReifyRange(json, name) {
  var entry = json[name];
  return utils.isObject(entry) && hasOwn.call(entry, "reify")
    ? SemVer.validRange(entry.reify)
    : null;
}

function getCacheFileName(filePath, cacheKey, pkgInfo) {
  const ext = typeof filePath === "string" ? path.extname(filePath) : ".js";

  // Take only the major and minor components of the reify version, so that
  // we don't invalidate the cache every time a patch version is released.
  return createHash("sha1")
    .update(reifySemVer.major + "." + reifySemVer.minor)
    .update("\0")
    .update(utils.toString(filePath))
    .update("\0")
    .update(utils.toString(cacheKey))
    .update("\0")
    .update(JSON.stringify(pkgInfo.config))
    .update("\0")
    .digest("hex") + ext;
}

exports.getCacheFileName = getCacheFileName;

function getPkgInfo(dirPath) {
  dirPath = utils.toString(dirPath);
  if (dirPath in data.pkgInfo) {
    return data.pkgInfo[dirPath];
  }

  data.pkgInfo[dirPath] = null;
  if (path.basename(dirPath) === "node_modules") {
    return null;
  }

  const pkgInfo = readPkgInfo(dirPath);
  if (pkgInfo !== null) {
    return data.pkgInfo[dirPath] = pkgInfo;
  }

  const parentPath = path.dirname(dirPath);
  if (parentPath !== dirPath) {
    const pkgInfo = getPkgInfo(parentPath);
    if (pkgInfo !== null) {
      return data.pkgInfo[dirPath] = pkgInfo;
    }
  }

  return null;
}

exports.getPkgInfo = getPkgInfo;

function isREPL(mod) {
  while (mod != null) {
    if (mod.filename === null &&
        mod.id === "<repl>" &&
        mod.loaded === false &&
        mod.parent === void 0) {
      return true;
    }
    mod = mod.parent;
  }
  return false;
}

exports.isREPL = isREPL;

function maxSatisfying(versions, range) {
  const cacheKey = versions + "\0" + range;
  if (cacheKey in maxSatisfyingCache) {
    return maxSatisfyingCache[cacheKey];
  }
  return maxSatisfyingCache[cacheKey] = SemVer.maxSatisfying(versions, range);
}

exports.maxSatisfying = maxSatisfying;

function readPkgInfo(dirPath) {
  const pkgPath = path.join(dirPath, "package.json");
  const pkgJSON = fs.readJSON(pkgPath);

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
  const cachePath = typeof cacheDir === "string" ? path.join(dirPath, cacheDir) : null;
  const cacheFiles = cachePath === null ? null : fs.readdir(cachePath);

  const pkgInfo = new PkgInfo;
  pkgInfo.cachePath = cachePath;
  pkgInfo.config = config;
  pkgInfo.path = dirPath;
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
