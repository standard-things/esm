"use strict";

const hasOwn = Object.prototype.hasOwnProperty;
const underscoreCode = "_".charCodeAt(0);

// This Visitor API was inspired by a similar API provided by ast-types:
// https://github.com/benjamn/ast-types/blob/master/lib/path-visitor.js

function Visitor() {
  this.visit = this.visit.bind(this);
  this.visitWithoutReset = this.visitWithoutReset.bind(this);
  this.visitChildren = this.visitChildren.bind(this);
}

module.exports = Visitor;
const Vp = Visitor.prototype;

Vp.visit = function (path) {
  this.reset.apply(this, arguments);
  this.visitWithoutReset(path);
};

Vp.visitWithoutReset = function (path) {
  const value = path.getValue();
  if (Array.isArray(value)) {
    path.each(this.visitWithoutReset);
  } else if (path.getNode() === value) {
    const method = this["visit" + value.type];
    if (typeof method === "function") {
      // Note: the method must call this.visitChildren(path) to continue
      // traversing.
      method.call(this, path);
    } else {
      this.visitChildren(path);
    }
  }
};

Vp.visitChildren = function (path) {
  if (! path.valueIsNode()) {
    return;
  }

  const node = path.getValue();
  const keys = Object.keys(node);
  const keyCount = keys.length;

  for (let i = 0; i < keyCount; ++i) {
    const key = keys[i];

    if (key === "loc" || // Ignore .loc.{start,end} objects.
        // Ignore "private" properties added by Babel.
        key.charCodeAt(0) === underscoreCode) {
      continue;
    }

    const value = node[key];
    if (! (value && typeof value === "object")) {
      // Ignore properties whose values aren't objects.
      continue;
    }

    path.call(this.visitWithoutReset, key);
  }
};
