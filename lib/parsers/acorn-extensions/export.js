"use strict";

const acorn = require("acorn");
const tt = acorn.tokTypes;

exports.enable = function (parser) {
  parser.checkExports = checkExports;
  parser.parseExport = parseExport;
};

function checkExports(exported, name) {
  if (exported !== void 0) {
    exported[name] = true;
  }
}

function parseExport(node, exported) {
  this.next();

  if (this.type === tt.star) {
    return parseExportNamespaceSpecifiersAndSource(this, node, exported);
  }
  if (isExportDefaultSpecifier(this)) {
    return parseExportDefaultSpecifiersAndSource(this, node, exported);
  }
  if (this.type === tt._default) {
    return parseExportDefaultDeclaration(this, node, exported);
  }
  if (this.shouldParseExportStatement()) {
    return parseExportNamedDeclaration(this, node, exported);
  }
  return parseExportSpecifiersAndSource(this, node, exported);
}

function isCommaOrFrom(parser) {
  return parser.type === tt.comma || parser.isContextual("from");
}

function isExportDefaultSpecifier(parser) {
  return parser.type === tt.name && peekNextWith(parser, isCommaOrFrom);
}

function parseExportDefaultDeclaration(parser, node, exported) {
  // export default ...;
  exported.default = true;
  parser.next();

  let isAsync;
  if (parser.type === tt._function || (isAsync = parser.isAsyncFunction())) {
    const funcNode = parser.startNode();
    if (isAsync) {
      parser.next();
    }
    parser.next();
    node.declaration = parser.parseFunction(funcNode, "nullableID", false, isAsync);
  } else if (parser.type === tt._class) {
    node.declaration = parser.parseClass(parser.startNode(), "nullableID");
  } else {
    node.declaration = parser.parseMaybeAssign();
  }
  parser.semicolon();
  return parser.finishNode(node, "ExportDefaultDeclaration");
}

function parseExportDefaultSpecifiersAndSource(parser, node, exported) {
  // export def from '...';
  const specifier = parser.startNode();
  specifier.exported = parser.parseIdent(true);

  node.specifiers = [
    parser.finishNode(specifier, "ExportDefaultSpecifier")
  ];

  // export def [, * as ns [, { x, y as z }]] from '...';
  parseExportNamespaceSpecifiersMaybe(parser, node, exported);
  parseExportSpecifiersMaybe(parser, node);
  parseExportFrom(parser, node);
  return parser.finishNode(node, "ExportNamedDeclaration");
}

function parseExportFrom(parser, node) {
  parser.expectContextual("from");
  node.source = parser.type === tt.string ? parser.parseExprAtom() : null;
  parser.semicolon();
}

function parseExportNamedDeclaration(parser, node, exported) {
  // export var|const|let|function|class ...
  node.declaration = parser.parseStatement(true);
  node.source = null;
  node.specifiers = [];

  if (node.declaration.type === "VariableDeclaration") {
    parser.checkVariableExport(exported, node.declaration.declarations);
  } else {
    exported[node.declaration.id.name] = true;
  }
  return parser.finishNode(node, "ExportNamedDeclaration");
}

function parseExportNamespaceSpecifiers(parser, node, specifier, exported) {
  parser.expectContextual("as");
  specifier.exported = parser.parseIdent(true);
  node.specifiers.push(
    parser.finishNode(specifier, "ExportNamespaceSpecifier")
  );

  exported[specifier.exported.name] = true;
}

function parseExportNamespaceSpecifiersAndSource(parser, node, exported) {
  const star = parser.startNode();
  node.specifiers = [];
  parser.next();

  if (! parser.isContextual("as")) {
    // export * from '...';
    parseExportFrom(parser, node);
    return parser.finishNode(node, "ExportAllDeclaration");
  }
  // export * as ns[, { x, y as z }] from '...';
  parseExportNamespaceSpecifiers(parser, node, star, exported);
  parseExportSpecifiersMaybe(parser, node);
  parseExportFrom(parser, node);
  return parser.finishNode(node, "ExportNamedDeclaration");
}

function parseExportNamespaceSpecifiersMaybe(parser, node, exported) {
  if (parser.type === tt.comma && peekNextType(parser) === tt.star) {
    parser.next();
    const star = parser.startNode();
    parser.next();
    parseExportNamespaceSpecifiers(parser, node, star, exported);
  }
}

function parseExportSpecifiersAndSource(parser, node, exported) {
  // export { x, y as z } [from '...'];
  node.declaration = null;
  node.specifiers = parser.parseExportSpecifiers(exported);

  if (parser.isContextual("from")) {
    parseExportFrom(parser, node, exported);
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
  return peekNextWith(parser, () => parser.type);
}

// Calls the given callback with the state of the parser temporarily advanced
// by calling this.nextToken(), then rolls the parser back to its original state
// and returns the result of the callback.
function peekNextWith(parser, callback) {
  const old = Object.assign(Object.create(null), parser);
  parser.nextToken();
  try {
    return callback(parser);
  } finally {
    Object.assign(parser, old);
  }
}
