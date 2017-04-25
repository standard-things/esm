"use strict";

const tt = require("acorn").tokTypes;

exports.enableAll = function (parser) {
  exports.enableTolerance(parser);
  exports.enableExportExtensions(parser);
};

exports.enableTolerance = function (parser) {
  // It's not Reify's job to enforce strictness.
  parser.strict = false;

  // Tolerate recoverable parse errors.
  parser.raiseRecoverable = noopRaiseRecoverable;
};

function noopRaiseRecoverable() {}

exports.enableExportExtensions = function (parser) {
  // Our custom lookahead method.
  parser.withLookAhead = withLookAhead;

  // Export-related modifications.
  parser.parseExport = parseExport;
  parser.isExportDefaultSpecifier = isExportDefaultSpecifier;
  parser.parseExportSpecifiersMaybe = parseExportSpecifiersMaybe;
  parser.parseExportFrom = parseExportFrom;
  parser.shouldParseExportDeclaration = shouldParseExportDeclaration;
};

function parseExport(node, exports) {
  this.next();
  if (this.type === tt.star) {
    const specifier = this.startNode();
    this.next();
    if (this.eatContextual("as")) {
      // export * as ns from '...'
      specifier.exported = this.parseIdent(true);
      node.specifiers = [
        this.finishNode(specifier, "ExportNamespaceSpecifier")
      ];
      this.parseExportSpecifiersMaybe(node);
      this.parseExportFrom(node, exports);
    } else {
      // export * from '...'
      this.parseExportFrom(node, exports);
      return this.finishNode(node, "ExportAllDeclaration");
    }
  } else if (this.isExportDefaultSpecifier()) {
    // export def from '...'
    const specifier = this.startNode();
    specifier.exported = this.parseIdent(true);
    node.specifiers = [
      this.finishNode(specifier, "ExportDefaultSpecifier")
    ];
    if (this.type === tt.comma &&
        peekNextType(this) === tt.star) {
      // export def, * as ns from '...'
      this.expect(tt.comma);
      const specifier = this.startNode();
      this.expect(tt.star);
      this.expectContextual("as");
      specifier.exported = this.parseIdent(true);
      node.specifiers.push(
        this.finishNode(specifier, "ExportNamespaceSpecifier")
      );
    } else {
      // export def, { x, y as z } from '...'
      this.parseExportSpecifiersMaybe(node);
    }
    this.parseExportFrom(node, exports);
  } else if (this.eat(tt._default)) {
    // export default ...
    exports.default = true;
    let isAsync;
    if (this.type === tt._function || (isAsync = this.isAsyncFunction())) {
      let fNode = this.startNode();
      this.next();
      if (isAsync) this.next();
      node.declaration = this.parseFunction(fNode, "nullableID", false, isAsync);
    } else if (this.type === tt._class) {
      let cNode = this.startNode();
      node.declaration = this.parseClass(cNode, "nullableID");
    } else {
      node.declaration = this.parseMaybeAssign();
      this.semicolon();
    }
    return this.finishNode(node, "ExportDefaultDeclaration");
  } else if (this.shouldParseExportDeclaration()) {
    // export var|const|let|function|class ...
    node.declaration = this.parseStatement(true);
    if (node.declaration.type === "VariableDeclaration") {
      this.checkVariableExport(exports, node.declaration.declarations);
    } else {
      exports[node.declaration.id.name] = true;
    }
    node.specifiers = [];
    node.source = null;
  } else {
    // export { x, y as z } [from '...']
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers(exports);
    this.parseExportFrom(node, exports);
  }
  return this.finishNode(node, "ExportNamedDeclaration");
}

// Calls the given callback with the state of the parser temporarily
// advanced by calling this.nextToken() n times, then rolls the parser
// back to its original state and returns whatever the callback returned.
function withLookAhead(n, callback) {
  const old = Object.assign(Object.create(null), this);
  while (n-- > 0) this.nextToken();
  try {
    return callback.call(this);
  } finally {
    Object.assign(this, old);
  }
}

function peekNextType(parser) {
  return parser.withLookAhead(1, () => parser.type);
}

function isExportDefaultSpecifier() {
  return this.type === tt.name &&
    this.withLookAhead(1, isCommaOrFrom);
}

function isCommaOrFrom() {
  // Note: `this` should be the parser object.
  return this.type === tt.comma ||
    (this.type === tt.name &&
     this.value === "from");
}

function parseExportSpecifiersMaybe(node) {
  if (this.eat(tt.comma)) {
    node.specifiers.push.apply(
      node.specifiers,
      this.parseExportSpecifiers()
    );
  }
}

function parseExportFrom(node, exports) {
  const hasFrom = this.eatContextual("from") && this.type === tt.string;
  node.source = hasFrom ? this.parseExprAtom() : null;

  if (node.specifiers) {
    for (let i = 0; i < node.specifiers.length; i++) {
      const s = node.specifiers[i];
      const exported = s.exported;
      exports[exported.name] = true;
    }
  }

  this.semicolon();
}

function shouldParseExportDeclaration() {
  return this.type.keyword === "var" ||
    this.type.keyword === "const" ||
    this.type.keyword === "class" ||
    this.type.keyword === "function" ||
    this.isLet() ||
    this.isAsyncFunction();
}
