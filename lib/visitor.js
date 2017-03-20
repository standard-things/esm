"use strict";

const hasOwn = Object.prototype.hasOwnProperty;

// This Visitor API was inspired by a similar API provided by ast-types:
// https://github.com/benjamn/ast-types/blob/master/lib/path-visitor.js

function Visitor() {
  this.visit = this.visit.bind(this);
  this.visitWithoutReset = this.visitWithoutReset.bind(this);
  this.traverse = this.traverse.bind(this);
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
      // Note: the method must call this.traverse(path) to continue
      // traversing.
      method.call(this, path);
    } else {
      this.traverse(path);
    }
  }
};

Vp.traverse = function (path) {
  if (! path.valueIsNode()) {
    return;
  }

  const node = path.getValue();

  Object.keys(node).forEach(function (key) {
    if (key === "loc") {
      return;
    }

    if (key.charAt(0) === "_") {
      return;
    }

    const value = node[key];
    if (! (value && typeof value === "object")) {
      return;
    }

    path.call(this.visitWithoutReset, key);
  }, this);
};
