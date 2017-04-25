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
  // Lookahead method.
  parser.lookAhead = lookAhead;

  // Export-related modifications.
  parser.parseExport = parseExport;
  parser.isExportDefaultSpecifier = isExportDefaultSpecifier;
  parser.parseExportSpecifiersMaybe = parseExportSpecifiersMaybe;
  parser.parseExportFromWithCheck = parseExportFromWithCheck;
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
      this.parseExportFromWithCheck(node, exports, true);
    } else {
      // export * from '...'
      this.parseExportFromWithCheck(node, exports, true);
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
        this.lookAhead(1).type === tt.star) {
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
    this.parseExportFromWithCheck(node, exports, true);
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
    this.parseExportFrom(node, false);
  }
  return this.finishNode(node, "ExportNamedDeclaration");
}

function lookAhead(n) {
  const old = Object.assign(Object.create(null), this);
  while (n-- > 0) this.nextToken();
  const copy = Object.assign(Object.create(null), this);
  Object.assign(this, old);
  return copy;
}

function isExportDefaultSpecifier() {
  if (this.type !== tt.name) {
    return false;
  }

  const lookAhead = this.lookAhead(1);
  return lookAhead.type === tt.comma ||
    (lookAhead.type === tt.name &&
     lookAhead.value === "from");
}

function parseExportSpecifiersMaybe(node) {
  if (this.eat(tt.comma)) {
    node.specifiers.push.apply(
      node.specifiers,
      this.parseExportSpecifiers()
    );
  }
}

function parseExportFromWithCheck(node, exports, expect) {
  this.parseExportFrom(node, expect);

  if (node.specifiers) {
    for (let i = 0; i < node.specifiers.length; i++) {
      const s = node.specifiers[i];
      const exported = s.exported;
      exports[exported.name] = true;
    }
  }
}

function parseExportFrom(node, expect) {
  if (this.eatContextual("from")) {
    node.source = this.type === tt.string
      ? this.parseExprAtom()
      : this.unexpected();
  } else {
    if (node.specifiers) {
      // check for keywords used as local names
      for (let i = 0; i < node.specifiers.length; i++) {
        const local = node.specifiers[i].local;
        if (local && (this.keywords.test(local.name) ||
                      this.reservedWords.test(local.name))) {
          this.unexpected(local.start);
        }
      }
    }

    if (expect) {
      this.unexpected();
    } else {
      node.source = null;
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
