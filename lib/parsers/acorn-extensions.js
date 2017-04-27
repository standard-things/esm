"use strict";

const tt = require("acorn").tokTypes;

exports.enableAll = function (parser) {
  exports.enableExportExtensions(parser);
  exports.enableTolerance(parser);
};

exports.enableExportExtensions = function (parser) {
  parser.checkExports = checkExports;
  parser.parseExport = parseExport;
};

exports.enableTolerance = function (parser) {
  // It's not Reify's job to enforce strictness.
  parser.strict = false;

  // Tolerate recoverable parse errors.
  parser.raiseRecoverable = noopRaiseRecoverable;
};

function checkExports(exports, name) {
  if (exports !== void 0) {
    exports[name] = true;
  }
}

function isCommaOrFrom(parser) {
  return parser.type === tt.comma || parser.isContextual("from");
}

function isExportDefaultSpecifier(parser) {
  return parser.type === tt.name &&
    withLookAhead(parser, 1, isCommaOrFrom);
}

function noopRaiseRecoverable() {}

function parseExport(node, exports) {
  this.next();

  if (this.type === tt.star) {
    return parseExportNamespaceSpecifiersAndSource(this, node, exports);
  }
  if (isExportDefaultSpecifier(this)) {
    return parseExportDefaultSpecifiersAndSource(this, node, exports);
  }
  if (this.eat(tt._default)) {
    return parseExportDefaultDeclaration(this, node, exports);
  }
  if (this.shouldParseExportStatement()) {
    return parseExportNamedDeclaration(this, node, exports);
  }
  return parseExportSpecifiersAndSource(this, node, exports);
}

function parseExportDefaultDeclaration(parser, node, exports) {
  // export default ...;
  exports.default = true;

  let isAsync;
  if (parser.type === tt._function || (isAsync = parser.isAsyncFunction())) {
    const funcNode = parser.startNode();
    if (isAsync) {
      parser.next();
    }
    parser.next();
    node.declaration = parser.parseFunction(funcNode, "nullableID", false, isAsync);
  } else if (parser.type === tt._class) {
    const classNode = parser.startNode();
    node.declaration = parser.parseClass(classNode, "nullableID");
  } else {
    node.declaration = parser.parseMaybeAssign();
  }
  parser.semicolon();
  return parser.finishNode(node, "ExportDefaultDeclaration");
}

function parseExportDefaultSpecifiersAndSource(parser, node, exports) {
  // export def from '...';
  const specifier = parser.startNode();
  specifier.exported = parser.parseIdent(true);

  node.specifiers = [
    parser.finishNode(specifier, "ExportDefaultSpecifier")
  ];

  if (parser.type === tt.comma &&
      peekNextType(parser) === tt.star) {
    // export def, * as ns from '...';
    parser.next();
    const specifier = parser.startNode();
    parser.next();
    parseExportNamespaceSpecifiers(parser, node, specifier, exports);
  }
  // export def, * as ns [, { x, y as z }] from '...';
  parseExportSpecifiersMaybe(parser, node);

  parseExportFrom(parser, node);
  return parser.finishNode(node, "ExportNamedDeclaration");
}

function parseExportFrom(parser, node) {
  parser.expectContextual("from");
  node.source = parser.type === tt.string ? parser.parseExprAtom() : null;
  parser.semicolon();
}

function parseExportNamedDeclaration(parser, node, exports) {
  // export var|const|let|function|class ...
  node.declaration = parser.parseStatement(true);
  node.source = null;
  node.specifiers = [];

  if (node.declaration.type === "VariableDeclaration") {
    parser.checkVariableExport(exports, node.declaration.declarations);
  } else {
    exports[node.declaration.id.name] = true;
  }
  return parser.finishNode(node, "ExportNamedDeclaration");
}

function parseExportNamespaceSpecifiers(parser, node, specifier, exports) {
  parser.expectContextual("as");
  specifier.exported = parser.parseIdent(true);
  node.specifiers.push(
    parser.finishNode(specifier, "ExportNamespaceSpecifier")
  );

  exports[specifier.exported.name] = true;
}

function parseExportNamespaceSpecifiersAndSource(parser, node, exports) {
  const specifier = parser.startNode();

  node.specifiers = [];
  parser.next();

  if (! parser.isContextual("as")) {
    // export * from '...';
    parseExportFrom(parser, node);
    return parser.finishNode(node, "ExportAllDeclaration");
  }
  // export * as ns from '...';
  parseExportNamespaceSpecifiers(parser, node, specifier, exports);
  // export * as ns[, { x, y as z }] from '...';
  parseExportSpecifiersMaybe(parser, node);

  parseExportFrom(parser, node);
  return parser.finishNode(node, "ExportNamedDeclaration");
}

function parseExportSpecifiersAndSource(parser, node, exports) {
  // export { x, y as z } [from '...'];
  node.declaration = null;
  node.specifiers = parser.parseExportSpecifiers(exports);

  if (parser.isContextual("from")) {
    parseExportFrom(parser, node, exports);
  } else {
    parser.semicolon();
  }
  return parser.finishNode(node, "ExportNamedDeclaration");
}

function parseExportSpecifiersMaybe(parser, node) {
  if (parser.eat(tt.comma)) {
    node.specifiers.push.apply(
      node.specifiers,
      parser.parseExportSpecifiers()
    );
  }
}

function peekNextType(parser) {
  return withLookAhead(parser, 1, () => parser.type);
}

// Calls the given callback with the state of the parser temporarily
// advanced by calling this.nextToken() n times, then rolls the parser
// back to its original state and returns whatever the callback returned.
function withLookAhead(parser, n, callback) {
  if (n < 1) {
    return;
  }
  const old = Object.assign(Object.create(null), parser);
  while (n--) parser.nextToken();
  try {
    return callback(parser);
  } finally {
    Object.assign(parser, old);
  }
}
