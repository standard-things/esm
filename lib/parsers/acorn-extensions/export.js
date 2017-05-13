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
  // export ...
  this.next();

  if (this.type === tt.star) {
    // ... * [as ns[, { x, y as z }]] from '...';
    return parseExportNamespaceSpecifiersAndSource(this, node, exported);
  }
  if (this.type === tt.name && peekNextWith(this, isCommaOrFrom)) {
    // ... def [, * as ns [, { x, y as z }]] from '...';
    return parseExportDefaultSpecifiersAndSource(this, node, exported);
  }
  if (this.type === tt._default) {
    // ... default function|class|=...;
    return parseExportDefaultDeclaration(this, node, exported);
  }
  if (this.shouldParseExportStatement()) {
    // ... var|const|let|function|class ...
    return parseExportNamedDeclaration(this, node, exported);
  }
  // ... { x, y as z } [from '...'];
  return parseExportSpecifiersAndSource(this, node, exported);
}

function getType(parser) {
  return parser.type;
}

function isCommaOrFrom(parser) {
  return parser.type === tt.comma || parser.isContextual("from");
}

function parseExportDefaultDeclaration(parser, node, exported) {
  // ... default function|class|=...;
  exported.default = true;
  parser.next();

  let isAsync;
  if (parser.type === tt._function || (isAsync = parser.isAsyncFunction())) {
    // Parse a function declaration.
    const funcNode = parser.startNode();
    if (isAsync) {
      parser.next();
    }
    parser.next();
    node.declaration = parser.parseFunction(funcNode, "nullableID", false, isAsync);
  } else if (parser.type === tt._class) {
    // Parse a class declaration.
    node.declaration = parser.parseClass(parser.startNode(), "nullableID");
  } else {
    // Parse an assignment expression.
    node.declaration = parser.parseMaybeAssign();
  }
  parser.semicolon();
  return parser.finishNode(node, "ExportDefaultDeclaration");
}

function parseExportDefaultSpecifiersAndSource(parser, node, exported) {
  // ... def [, * as ns [, { x, y as z }]] from '...';
  const specifier = parser.startNode();
  specifier.exported = parser.parseIdent(true);
  node.specifiers = [parser.finishNode(specifier, "ExportDefaultSpecifier")];

  parseExportNamespaceSpecifiersMaybe(parser, node, exported);
  parseExportSpecifiersMaybe(parser, node);
  parseExportFrom(parser, node);
  return parser.finishNode(node, "ExportNamedDeclaration");
}

function parseExportFrom(parser, node) {
  // ... from '...';
  parser.expectContextual("from");
  node.source = parser.type === tt.string ? parser.parseExprAtom() : null;
  parser.semicolon();
}

function parseExportNamedDeclaration(parser, node, exported) {
  // ... var|const|let|function|class ...
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

function parseExportNamespaceSpecifiers(parser, node, star, exported) {
  // ... as ns
  parser.expectContextual("as");
  star.exported = parser.parseIdent(true);
  node.specifiers.push(parser.finishNode(star, "ExportNamespaceSpecifier"));
  exported[star.exported.name] = true;
}

function parseExportNamespaceSpecifiersAndSource(parser, node, exported) {
  // ... * [as ns[, { x, y as z }]] from '...';
  const star = parser.startNode();
  let type = "ExportAllDeclaration";

  node.specifiers = [];
  parser.next();

  if (parser.isContextual("as")) {
    type = "ExportNamedDeclaration";
    parseExportNamespaceSpecifiers(parser, node, star, exported);
    parseExportSpecifiersMaybe(parser, node);
  }
  parseExportFrom(parser, node);
  return parser.finishNode(node, type);
}

function parseExportNamespaceSpecifiersMaybe(parser, node, exported) {
  // ... , * as ns
  if (parser.type === tt.comma &&
      peekNextWith(parser, getType) === tt.star) {
    parser.next();
    const star = parser.startNode();
    parser.next();
    parseExportNamespaceSpecifiers(parser, node, star, exported);
  }
}

function parseExportSpecifiersAndSource(parser, node, exported) {
  // ... { x, y as z } [from '...'];
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
  // ... , { x, y as z }
  if (parser.eat(tt.comma)) {
    const specifiers = node.specifiers;
    specifiers.push.apply(specifiers, parser.parseExportSpecifiers());
  }
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
