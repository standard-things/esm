"use strict";

const acorn = require("acorn");

const Pp = acorn.Parser.prototype;
const tt = acorn.tokTypes;

exports.enable = function (parser) {
  parser.parseImportSpecifiers = parseImportSpecifiers;
};

function parseImportSpecifiers() {
  const specifiers = [];

  do {
    if (this.type === tt.name) {
      // ... def [, ...]
      specifiers.push(parseImportDefaultSpecifier(this));
    } else if (this.type === tt.star) {
      // ... * as ns [, ...]
      specifiers.push(parseImportNamespaceSpecifier(this));
    } else if (this.type === tt.braceL) {
      // ... { x, y as z } [, ...]
      specifiers.push.apply(specifiers, Pp.parseImportSpecifiers.call(this));
    }
  }
  while (this.eat(tt.comma));

  return specifiers;
}

function parseImportDefaultSpecifier(parser) {
  // ... def
  const specifier = parser.startNode();
  specifier.local = parser.parseIdent();
  return parser.finishNode(specifier, "ImportDefaultSpecifier");
}

function parseImportNamespaceSpecifier(parser) {
  // ... * as ns
  const star = parser.startNode();
  parser.next();
  parser.expectContextual("as");
  star.local = parser.parseIdent();
  return parser.finishNode(star, "ImportNamespaceSpecifier");
}
