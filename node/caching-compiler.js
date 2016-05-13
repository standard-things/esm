var fs = require("fs");
var path = require("path");
var compile = require("../lib/compiler.js").compile;
var hasOwn = Object.prototype.hasOwnProperty;

// Map from absolute file paths to the package.json that governs them.
var pkgJsonCache = Object.create(null);

exports.compile = function (content, filename) {
  var pkg = getPkgJson(filename);
  if (pkg) {
    if (hasOwn.call(pkg, "reify") && ! pkg.reify) {
      // An explicit "reify": false property in package.json disables
      // reification even if "reify" is listed as a dependency.
      return content;
    }

    function check(name) {
      return typeof pkg[name] === "object" &&
        hasOwn.call(pkg[name], "reify");
    }

    if (check("dependencies") ||
        check("peerDependencies") ||
        // Use case: a package.json file may have "reify" in its
        // "devDependencies" section because it expects another package or
        // application to enable reification in production, but needs its
        // own copy of the "reify" package during development. Disabling
        // reification in production when it was enabled in development
        // would be dangerous in this case.
        check("devDependencies")) {
      return compile(content);
    }
  }

  return content;
};

function getPkgJson(filename) {
  if (hasOwn.call(pkgJsonCache, filename)) {
    return pkgJsonCache[filename];
  }

  try {
    var stat = fs.statSync(filename);
  } catch (e) {
    return pkgJsonCache[filename] = null;
  }

  if (stat.isDirectory()) {
    if (path.basename(filename) === "node_modules") {
      return pkgJsonCache[filename] = null;
    }

    var pkg = readPkgInfo(filename);
    if (pkg) {
      return pkgJsonCache[filename] = pkg;
    }
  }

  var parentDir = path.dirname(filename);
  return pkgJsonCache[filename] =
    parentDir !== filename &&
    getPkgJson(parentDir);
}

function readPkgInfo(dir) {
  try {
    return JSON.parse(fs.readFileSync(
      path.join(dir, "package.json")
    ));

  } catch (e) {
    if (! (e instanceof SyntaxError ||
           e.code === "ENOENT")) {
      throw e;
    }
  }

  return null;
}
