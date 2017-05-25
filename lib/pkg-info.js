"use strict";

class PkgInfo {
  constructor() {
    this.cache = Object.create(null);
    this.cachePath = null;
    this.config = null;
    this.path = null;
    this.range = null;
  }
};

Object.setPrototypeOf(PkgInfo.prototype, null);

module.exports = PkgInfo;
