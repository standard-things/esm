"use strict";

const fs = require("fs");
const path = require("path");
const createHash = require("crypto").createHash;
const compile = require("../lib/compiler.js").compile;
const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const hasOwn = Object.prototype.hasOwnProperty;

// Map from absolute file paths to the package.json that governs them.
const pkgInfoCache = Object.create(null);

// Take only the major and minor components of the reify version, so that
// we don't invalidate the cache every time a patch version is released.
const reifyVersion =
  (process.env.REIFY_VERSION || dynRequire("../package.json").version)
    .split(".", 2).join(".");

const DEFAULT_CACHE_DIR = ".reify-cache";

exports.compile = (content, options) => {
  options = Object.assign(Object.create(null), options);

  if (options.filename === "repl") {
    // Treat the REPL as if there was no filename.
    options.filename = null;
  }

  const pkgInfo = options.filename
    ? getPkgInfo(options.filename)
    : fallbackPkgInfo;

  if (! pkgInfo) {
    return content;
  }

  return options.filename
    ? compileWithCacheAndFilename(pkgInfo, content, options)
    : compileWithCache(pkgInfo, content, options);
};

function compileWithCacheAndFilename(pkgInfo, content, options) {
  try {
    return compileWithCache(pkgInfo, content, options);
  } catch (e) {
    e.message += ' while processing file: ' + options.filename;
    throw e;
  }
}

// Used when compile filename argument is falsy. Enables in-memory
// caching, at least.
const fallbackPkgInfo = {
  cache: Object.create(null)
};

function compileWithCache(pkgInfo, content, options) {
  const json = pkgInfo ? pkgInfo.json : null;
  const reify = json ? json.reify : null;

  const cacheKey = typeof options.makeCacheKey === "function"
    ? options.makeCacheKey()
    : options.cacheKey || content;

  const cacheFilename = getCacheFilename(cacheKey, reify);

  const absCachePath = typeof pkgInfo.cacheDir === "string" &&
    path.join(pkgInfo.cacheDir, cacheFilename);

  if (hasOwn.call(pkgInfo.cache, cacheFilename)) {
    let cacheValue = pkgInfo.cache[cacheFilename];

    if (cacheValue === true && absCachePath) {
      cacheValue = pkgInfo.cache[cacheFilename] =
        readFileOrNull(absCachePath);
    }

    if (typeof cacheValue === "string") {
      return cacheValue;
    }
  }

  const filename = options.filename;
  const force = !!filename && path.extname(filename) === ".mjs";

  const compileOptions = {
    ast: false,
    force
  };

  if (reify && reify.parser) {
    compileOptions.parse = dynRequire(reify.parser).parse;
  };

  const result = compile(content, compileOptions);
  content = result.code;

  if (result.identical) {
    // Don't bother caching result if compiler made no changes.
    return content;
  }

  pkgInfo.cache[cacheFilename] = content;

  if (typeof pkgInfo.cacheDir === "string") {
    scheduleWrite(absCachePath, content);
  }

  return content;
}

const pendingWrites = Object.create(null);
let pendingWriteTimer;

function scheduleWrite(path, content) {
  pendingWrites[path] = content;
  pendingWriteTimer = pendingWriteTimer || setTimeout(function () {
    pendingWriteTimer = null;
    Object.keys(pendingWrites).forEach(function (path) {
      const content = pendingWrites[path];
      delete pendingWrites[path];
      fs.writeFileSync(path, content, "utf8");
    });
  }, 10);
}

function readFileOrNull(filename) {
  try {
    return fs.readFileSync(filename, "utf8");
  } catch (e) {
    return null;
  }
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
    .update(reifyVersion)
    .update("\0")
    .update(strings.join("\0"))
    .digest("hex") + ".js";
}

function getPkgInfo(filename) {
  if (hasOwn.call(pkgInfoCache, filename)) {
    return pkgInfoCache[filename];
  }

  const stat = statOrNull(filename);
  if (! stat) {
    return pkgInfoCache[filename] = null;
  }

  if (stat.isDirectory()) {
    if (path.basename(filename) === "node_modules") {
      return pkgInfoCache[filename] = null;
    }

    const pkgInfo = readPkgInfo(filename);
    if (pkgInfo) {
      return pkgInfoCache[filename] = pkgInfo;
    }
  }

  const parentDir = path.dirname(filename);
  return pkgInfoCache[filename] =
    parentDir !== filename &&
    getPkgInfo(parentDir);
}

function statOrNull(filename) {
  try {
    return fs.statSync(filename);
  } catch (e) {
    return null;
  }
}
exports.statOrNull = statOrNull;

function readPkgInfo(dir) {
  let pkg;

  try {
    pkg = JSON.parse(fs.readFileSync(
      path.join(dir, "package.json")
    ));

  } catch (e) {
    if (! (e instanceof SyntaxError ||
           e.code === "ENOENT")) {
      throw e;
    }
  }

  if (pkg && typeof pkg === "object") {
    const reify = pkg.reify;
    if (reify === false) {
      // An explicit "reify": false property in package.json disables
      // reification even if "reify" is listed as a dependency.
      return null;
    }

    const check = (name) => (
      typeof pkg[name] === "object" && hasOwn.call(pkg[name], "reify")
    );

    if (! check("dependencies") &&
        ! check("peerDependencies") &&
        // Use case: a package.json file may have "reify" in its
        // "devDependencies" section because it expects another package or
        // application to enable reification in production, but needs its
        // own copy of the "reify" package during development. Disabling
        // reification in production when it was enabled in development
        // would be dangerous in this case.
        ! check("devDependencies")) {
      return null;
    }

    const pkgInfo = {
      json: pkg,
      cacheDir: null,
      cache: Object.create(null)
    };

    if (reify) {
      let cacheDir = hasOwn.call(reify, "cache-directory")
        ? reify["cache-directory"]
        : DEFAULT_CACHE_DIR;

      if (typeof cacheDir === "string") {
        cacheDir = mkdirp(dir, cacheDir);

        const cacheFiles = cacheDir ? fs.readdirSync(cacheDir) : null;
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
      }
    }

    return pkgInfo;
  }

  return null;
}

function getOwn(obj, name) {
  return obj &&
    typeof obj === "object" &&
    hasOwn.call(obj, name) &&
    obj[name];
}

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
