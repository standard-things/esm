"use strict";

const createHash = require("crypto").createHash;
const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const fs = require("fs");
const path = require("path");

const DEFAULT_CACHE_DIR = ".reify-cache";
const hasOwn = Object.prototype.hasOwnProperty;

let pendingWriteTimer;
const pendingWrites = Object.create(null);

// Map from absolute file paths to the package.json that governs them.
const pkgInfoCache = Object.create(null);

const reifyVersion = (() => {
  const parts = (
    process.env.REIFY_VERSION ||
    dynRequire("../package.json").version
  ).split(".");

  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2]
  };
})();

function checkReify(pkg, name) {
  var entry = pkg[name];
  return typeof entry === "object" && entry !== null && hasOwn.call(entry, "reify");
}

function getCacheFilename() {
  const argCount = arguments.length;
  const strings = new Array(argCount);

  for (let i = 0; i < argCount; ++i) {
    const arg = arguments[i];
    if (typeof arg === "string") {
      strings[i] = arg;
    } else {
      strings[i] = JSON.stringify(arg);
    }
  }

  return createHash("sha1")
    // Take only the major and minor components of the reify version, so that
    // we don't invalidate the cache every time a patch version is released.
    .update(reifyVersion.major + "." + reifyVersion.minor)
    .update("\0")
    .update(strings.join("\0"))
    .digest("hex") + ".js";
}

exports.getCacheFilename = getCacheFilename;

function getPkgInfo(filename) {
  if (pkgInfoCache[filename]) {
    return pkgInfoCache[filename];
  }

  pkgInfoCache[filename] = null;

  const stat = statOrNull(filename);
  if (! stat) {
    return null;
  }

  if (stat.isDirectory()) {
    if (path.basename(filename) === "node_modules") {
      return null;
    }

    const pkgInfo = readPkgInfo(filename);
    if (pkgInfo) {
      return pkgInfoCache[filename] = pkgInfo;
    }
  }

  const parentDir = path.dirname(filename);

  if (parentDir !== filename) {
    return pkgInfoCache[filename] = getPkgInfo(parentDir);
  }
  return null;
}

exports.getPkgInfo = getPkgInfo;

function mkdirp(rootDir, relativeDir) {
  const parentDir = path.dirname(relativeDir);
  if (parentDir === relativeDir) {
    return rootDir;
  }

  if (! mkdirp(rootDir, parentDir)) {
    return null;
  }

  const absoluteDir = path.join(rootDir, relativeDir);
  const stat = statOrNull(absoluteDir);
  if (stat && stat.isDirectory()) {
    return absoluteDir;
  }

  try {
    fs.mkdirSync(absoluteDir);
  } catch (e) {
    return null;
  }

  return absoluteDir;
}

exports.mkdirp = mkdirp;

function readFileOrNull(filename) {
  try {
    return fs.readFileSync(filename, "utf8");
  } catch (e) {}
  return null;
}

exports.readFileOrNull = readFileOrNull;

function readPkgInfo(dir) {
  const pkg = (() => {
    try {
      return dynRequire(path.join(dir, "package.json"));
    } catch (e) {}
    return null;
  })();

  if (! pkg) {
    return null;
  }

  const reify = pkg.reify == null ? {} : pkg.reify;

  if (reify === false) {
    // An explicit "reify": false property in package.json disables
    // reification even if "reify" is listed as a dependency.
    return null;
  }

  if (! checkReify(pkg, "dependencies") &&
      ! checkReify(pkg, "peerDependencies") &&
      // Use case: a package.json file may have "reify" in its
      // "devDependencies" section because it expects another package or
      // application to enable reification in production, but needs its
      // own copy of the "reify" package during development. Disabling
      // reification in production when it was enabled in development
      // would be dangerous in this case.
      ! checkReify(pkg, "devDependencies")) {
    return null;
  }

  const pkgInfo = {
    cache: Object.create(null),
    cacheDir: null,
    json: pkg
  };

  const cacheDirName = hasOwn.call(reify, "cache-directory")
    ? reify["cache-directory"]
    : DEFAULT_CACHE_DIR;

  const cacheDir = typeof cacheDirName === "string"
    ? mkdirp(dir, cacheDirName)
    : null;

  const cacheFiles = cacheDir
    ? fs.readdirSync(cacheDir)
    : null;

  if (cacheFiles) {
    // If we leave pkgInfo.cacheDir === null, we won't be able to
    // save cache files to disk, but we can still cache compilation
    // results in memory.
    pkgInfo.cacheDir = cacheDir;

    const filesCount = cacheFiles.length;

    for (let i = 0; i < filesCount; ++i) {
      // Later we'll change the value to the actual contents of the
      // file, but for now we merely register that it exists.
      pkgInfo.cache[cacheFiles[i]] = true;
    }
  }

  return pkgInfo;
}

exports.readPkgInfo = readPkgInfo;

function scheduleWrite(path, content) {
  pendingWrites[path] = content;
  pendingWriteTimer = pendingWriteTimer || setTimeout(() => {
    pendingWriteTimer = null;
    Object.keys(pendingWrites).forEach((path) => {
      const content = pendingWrites[path];
      delete pendingWrites[path];
      fs.writeFileSync(path, content, "utf8");
    });
  }, 10);
}

exports.scheduleWrite = scheduleWrite;

function statOrNull(filename) {
  try {
    return fs.statSync(filename);
  } catch (e) {}
  return null;
}

exports.statOrNull = statOrNull;
