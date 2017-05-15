"use strict";

const acorn = require("acorn");
const dummyParser = new acorn.Parser;
const tt = acorn.tokTypes;

exports.enable = function (parser) {
  parser.parseExport = parseExport;
};

function parseExport(node, exported) {
  // export ...
  this.next();

  if (this.type === tt._default) {
    // ... default function|class|=...;
    return parseExportDefaultDeclaration(this, node, exported);
  }
  if (this.type === tt.star && lookahead(this).isContextual("from")) {
    // ... * from '...';
    return parseExportNamespace(this, node);
  }
  if (this.shouldParseExportStatement()) {
    // ... var|const|let|function|class ...
    return parseExportNamedDeclaration(this, node, exported);
  }

  let expectFrom = false;
  node.specifiers = [];

  do {
    if (this.type === tt.name) {
      // ... def [, ...]
      expectFrom = true;
      parseExportDefaultSpecifier(this, node);
    } else if (this.type === tt.star) {
      // ... * as ns [, ...]
      expectFrom = true;
      parseExportNamespaceSpecifier(this, node, exported);
    } else if (this.type === tt.braceL) {
      // ... { x, y as z } [, ...]
      parseExportSpecifiers(this, node);
    }
  }
  while (this.eat(tt.comma));

  if (expectFrom || this.isContextual("from")) {
    // ... [from '...'];
    parseExportFrom(this, node, exported);
  } else {
    this.semicolon();
  }

  return this.finishNode(node, "ExportNamedDeclaration");
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

function parseExportDefaultSpecifier(parser, node) {
  // ... def
  const specifier = parser.startNode();
  specifier.exported = parser.parseIdent(true);
  node.specifiers.push(parser.finishNode(specifier, "ExportDefaultSpecifier"));
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

function parseExportNamespace(parser, node) {
  // ... * from '...';
  parser.next();
  node.specifiers = [];
  parseExportFrom(parser, node);
  return parser.finishNode(node, "ExportAllDeclaration");
}

function parseExportNamespaceSpecifier(parser, node, exported) {
  // ... * as ns
  const star = parser.startNode();
  parser.next();
  parser.expectContextual("as");
  star.exported = parser.parseIdent(true);
  node.specifiers.push(parser.finishNode(star, "ExportNamespaceSpecifier"));
  exported[star.exported.name] = true;
}

function parseExportSpecifiers(parser, node) {
  const specifiers = node.specifiers;
  specifiers.push.apply(specifiers, parser.parseExportSpecifiers());
}

function lookahead(parser) {
  dummyParser.input = parser.input;
  dummyParser.pos = parser.pos;
  dummyParser.nextToken();
  return dummyParser;
}
