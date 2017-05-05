"use strict";

const utils = require("./utils.js");

const codeOfUnderscore = "_".charCodeAt(0);

// This Visitor API was inspired by a similar API provided by ast-types:
// https://github.com/benjamn/ast-types/blob/master/lib/path-visitor.js

class Visitor {
  constructor() {
    const that = this;
    const visit = this.visit;
    const visitWithoutReset = this.visitWithoutReset;
    const visitChildren = this.visitChildren;

    // Avoid slower `Function#bind` for Node < 7.
    this.visit = function () {
      visit.apply(that, arguments);
    };

    this.visitWithoutReset = function (path) {
      visitWithoutReset.call(that, path);
    };

    this.visitChildren = function (path) {
      visitChildren.call(that, path);
    };
  }

  visit(path) {
    this.reset.apply(this, arguments);
    this.visitWithoutReset(path);
  }

  visitWithoutReset(path) {
    const value = path.getValue();
    if (Array.isArray(value)) {
      path.each(this.visitWithoutReset);
    } else if (path.getNode() === value) {
      const method = this["visit" + value.type];
      if (typeof method === "function") {
        // The method must call this.visitChildren(path) to continue traversing.
        method.call(this, path);
      } else {
        this.visitChildren(path);
      }
    }
  }

  visitChildren(path) {
    if (! path.valueIsNode()) {
      return;
    }

    const node = path.getValue();
    const keys = Object.keys(node);
    const keyCount = keys.length;

    for (let i = 0; i < keyCount; ++i) {
      const key = keys[i];
      const value = node[key];

      if (
          // Ignore .loc.{start,end} objects.
          key !== "loc" &&
          // Ignore "private" properties added by Babel.
          key.charCodeAt(0) !== codeOfUnderscore &&
          // Ignore properties whose values aren't objects.
          utils.isObject(value)) {
        path.call(this.visitWithoutReset, key);
      }
    }
  }
};

Object.setPrototypeOf(Visitor.prototype, null);

module.exports = Visitor;
