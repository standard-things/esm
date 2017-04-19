import { strictEqual } from "assert";

// Setting module.exports should still define the default exported value
// if there are no actual ExportDefaultDeclaration nodes.
module.exports = "pure CommonJS";

// The import statement above should have been compiled to a
// module.importSync call, which sets exports[Symbol.for("__esModule")] = true.
strictEqual(exports[Symbol.for("__esModule")], true);
