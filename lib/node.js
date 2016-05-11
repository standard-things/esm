var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Module = require("module");
var Mp = Module.prototype;
var hasOwn = Object.prototype.hasOwnProperty;
var Entry = require("./entry.js").Entry;
var compile = require("./compiler.js").compile;

// Make sure Module.prototype.{import,export} are defined.
require("./module.js");

// Override Module.prototype.load to call Entry.runModuleSetters whenever
// a module has loaded.
var load = Mp.load;
if (load.reified) return;
(Mp.load = function () {
  var result = load.apply(this, arguments);
  Entry.runModuleSetters(this);
  return result;
}).reified = load;

// Enable import and export statements in the default Node REPL.
require("./repl");

// Override Module.prototype._compile to compile any code that will be
// evaluated as a module.
// TODO Does this work in the Node REPL?
var _compile = Mp._compile;
(Mp._compile = function (content, filename) {
  return _compile.call(
    this,
    isEnabled(filename)
      ? compile(content)
      : content,
    filename
  );
}).reified = _compile;

var isEnabledCache = Object.create(null);

function isEnabled(filename) {
  if (hasOwn.call(isEnabledCache, filename)) {
    return isEnabledCache[filename];
  }

  try {
    var stat = fs.statSync(filename);
  } catch (e) {
    return isEnabledCache[filename] = false;
  }

  if (stat.isDirectory()) {
    if (path.basename(filename) === "node_modules") {
      return isEnabledCache[filename] = false;
    }

    var pkg = readPkgInfo(filename);
    if (pkg) {
      if (hasOwn.call(pkg, "reify")) {
        // An explicit "reify": false property in package.json disables
        // reification even if "reify" is listed as a dependency.
        return isEnabledCache[filename] = !! pkg.reify;
      }

      function check(name) {
        return typeof pkg[name] === "object" &&
          hasOwn.call(pkg[name], "reify");
      }

      return isEnabledCache[filename] =
        check("dependencies") ||
        check("peerDependencies") ||
        // Use case: a package.json file may have "reify" in its
        // "devDependencies" section because it expects another package or
        // application to enable reification in production, but needs its
        // own copy of the "reify" package during development. Disabling
        // reification in production when it was enabled in development
        // would be dangerous in this case.
        check("devDependencies");
    }
  }

  var parentDir = path.dirname(filename);
  return isEnabledCache[filename] =
    parentDir !== filename &&
    isEnabled(parentDir);
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
