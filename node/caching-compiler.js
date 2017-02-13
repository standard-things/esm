var fs = require("fs");
var path = require("path");
var createHash = require("crypto").createHash;
var compile = require("../lib/compiler.js").compile;
var hasOwn = Object.prototype.hasOwnProperty;

// Map from absolute file paths to the package.json that governs them.
var pkgInfoCache = Object.create(null);

// Take only the major and minor components of the reify version, so that
// we don't invalidate the cache every time a patch version is released.
var reifyVersion = require("../package.json")
  .version.split(".", 2).join(".");

exports.compile = function (content, filename) {
  if (filename === "repl") {
    // Treat the REPL as if there was no filename.
    filename = null;
  }

  var info = filename ? getPkgInfo(filename) : fallbackPkgInfo;
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
var fallbackPkgInfo = {
  cache: Object.create(null)
};

function readWithCache(info, content) {
  var cacheFilename = getCacheFilename(content);
  var absCachePath = typeof info.cacheDir === "string" &&
    path.join(info.cacheDir, cacheFilename);

  if (hasOwn.call(info.cache, cacheFilename)) {
    var cacheValue = info.cache[cacheFilename];

    if (cacheValue === true && absCachePath) {
      cacheValue = info.cache[cacheFilename] =
        readFileOrNull(absCachePath);
    }

    if (typeof cacheValue === "string") {
      return cacheValue;
    }
  }

  var options = { ast: false };
  content = compile(content, options).code;
  if (options.identical) {
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

function getCacheFilename(content) {
  return createHash("sha1")
    .update(reifyVersion)
    .update("\0")
    .update(content)
    .digest("hex") + ".json";
}

function getPkgInfo(filename) {
  if (hasOwn.call(pkgInfoCache, filename)) {
    return pkgInfoCache[filename];
  }

  var stat = statOrNull(filename);
  if (! stat) {
    return pkgInfoCache[filename] = null;
  }

  if (stat.isDirectory()) {
    if (path.basename(filename) === "node_modules") {
      return pkgInfoCache[filename] = null;
    }

    var info = readPkgInfo(filename);
    if (info) {
      return pkgInfoCache[filename] = info;
    }
  }

  var parentDir = path.dirname(filename);
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
  try {
    var pkg = JSON.parse(fs.readFileSync(
      path.join(dir, "package.json")
    ));

  } catch (e) {
    if (! (e instanceof SyntaxError ||
           e.code === "ENOENT")) {
      throw e;
    }
  }

  if (pkg && typeof pkg === "object") {
    var reify = pkg.reify;
    if (reify === false) {
      // An explicit "reify": false property in package.json disables
      // reification even if "reify" is listed as a dependency.
      return null;
    }

    function check(name) {
      return typeof pkg[name] === "object" &&
        hasOwn.call(pkg[name], "reify");
    }

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

    var info = {
      json: pkg,
      cacheDir: null,
      cache: Object.create(null)
    };

    if (reify) {
      var cacheDir = getOwn(reify, "cache-directory");

      if (typeof cacheDir === "string") {
        cacheDir = mkdirp(dir, cacheDir);

        var cacheFiles = cacheDir && fs.readdirSync(cacheDir);
        if (cacheFiles) {
          // If we leave info.cacheDir === null, we won't be able to save
          // cache files to disk, but we can still cache compilation
          // results in memory.
          info.cacheDir = cacheDir;

          cacheFiles.forEach(function (file) {
            // Later we'll change the value to the actual contents of the
            // file, but for now we merely register that it exists.
            if (/\.json$/.test(file)) {
              info.cache[file] = true;
            }
          });
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
  var parentDir = path.dirname(relativeDir);
  if (parentDir === relativeDir) {
    return rootDir;
  }

  if (! mkdirp(rootDir, parentDir)) {
    return null;
  }

  var absoluteDir = path.join(rootDir, relativeDir);
  var stat = statOrNull(absoluteDir);
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
