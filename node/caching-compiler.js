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
const reifyVersion = require("../package.json")
  .version.split(".", 2).join(".");

const DEFAULT_CACHE_DIR = ".reify-cache";

exports.compile = (content, filename) => {
  if (filename === "repl") {
    // Treat the REPL as if there was no filename.
    filename = null;
  }

  const info = filename ? getPkgInfo(filename) : fallbackPkgInfo;
  if (! info) {
    return content;
  }

  return filename
    ? readWithCacheAndFilename(info, content, filename)
    : readWithCache(info, content);
};

function readWithCacheAndFilename(info, content, filename) {
  try {
    return readWithCache(info, content);
  } catch (e) {
    e.message += ' while processing file: ' + filename;
    throw e;
  }
}

// Used when compile filename argument is falsy. Enables in-memory
// caching, at least.
const fallbackPkgInfo = {
  cache: Object.create(null)
};

function readWithCache(info, content) {
  const json = info && info.json;
  const reify = json && json.reify;
  const cacheFilename = getCacheFilename(content, reify);
  const absCachePath = typeof info.cacheDir === "string" &&
    path.join(info.cacheDir, cacheFilename);

  if (hasOwn.call(info.cache, cacheFilename)) {
    let cacheValue = info.cache[cacheFilename];

    if (cacheValue === true && absCachePath) {
      cacheValue = info.cache[cacheFilename] =
        readFileOrNull(absCachePath);
    }

    if (typeof cacheValue === "string") {
      return cacheValue;
    }
  }

  const compileOptions = {
    ast: false
  };

  if (reify && reify.parser) {
    compileOptions.parse = dynRequire(reify.parser).parse;
  };

  content = compile(content, compileOptions).code;

  if (compileOptions.identical) {
    // Don't bother caching result if compiler made no changes.
    return content;
  }

  info.cache[cacheFilename] = content;

  if (typeof info.cacheDir === "string") {
    // Writing cache files is something that should only happen at package
    // development time, so it's acceptable to use fs.writeFileSync
    // instead of some complicated asynchronous-but-atomic strategy.
    fs.writeFileSync(absCachePath, content, "utf8");
  }

  return content;
}

function readFileOrNull(filename) {
  try {
    return fs.readFileSync(filename, "utf8");
  } catch (e) {
    return null;
  }
}

function getCacheFilename(content, reify) {
  const hash = createHash("sha1")
    .update(reifyVersion).update("\0")
    .update(content).update("\0");

  if (reify) {
    hash.update(JSON.stringify(reify));
  }

  return hash.digest("hex") + ".js";
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

    const info = readPkgInfo(filename);
    if (info) {
      return pkgInfoCache[filename] = info;
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

    const info = {
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

        const cacheFiles = cacheDir && fs.readdirSync(cacheDir);
        if (cacheFiles) {
          // If we leave info.cacheDir === null, we won't be able to save
          // cache files to disk, but we can still cache compilation
          // results in memory.
          info.cacheDir = cacheDir;

          const filesCount = cacheFiles.length;

          for (let i = 0; i < filesCount; ++i) {
            // Later we'll change the value to the actual contents of the
            // file, but for now we merely register that it exists.
            const file = cacheFiles[i];
            if (/\.js$/.test(file)) {
              info.cache[file] = true;
            }
          }
        }
      }
    }

    return info;
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
