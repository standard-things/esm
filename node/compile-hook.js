var compile = require("./caching-compiler.js").compile;
var Module = require("./runtime.js").Module;
var Mp = Module.prototype;

// Override Module.prototype._compile to compile any code that will be
// evaluated as a module.
var _compile = Mp._compile;
if (! _compile.reified) {
  (Mp._compile = function (content, filename) {
    return _compile.call(
      this,
      // Don't touch the file unless reification is enabled for the
      // package that contains the file.
      compile(content, filename),
      filename
    );
  }).reified = _compile;
}
