"use strict";

// This module should be maximally compatible with older JS environments,
// just like the other files in reify/lib/runtime. Node 4+ features like
// let/const and arrow functions are not acceptable here, and importing
// any npm packages should be contemplated with extreme skepticism.

var hasOwn = Object.prototype.hasOwnProperty;
var useSymbol = typeof Symbol === "function";
var esStrKey = "__esModule";
var esSymKey = useSymbol ? Symbol.for(esStrKey) : null;

function getESModule(exported) {
  if (isObjectLike(exported)) {
    if (useSymbol && hasOwn.call(exported, esSymKey)) {
      return !! exported[esSymKey];
    }

    if (hasOwn.call(exported, esStrKey)) {
      return !! exported[esStrKey];
    }
  }

  return false;
}

exports.getESModule = getESModule;

function setESModule(exported) {
  if (isObjectLike(exported)) {
    if (useSymbol) {
      exported[esSymKey] = true;
    } else {
      Object.defineProperty(exported, esStrKey, {
        configurable: true,
        enumerable: false,
        value: true,
        writable: false
      });
    }
  }
}

exports.setESModule = setESModule;

function isObject(value) {
  return typeof value === "object" && value !== null;
}

exports.isObject = isObject;

function isObjectLike(value) {
  var type = typeof value;
  return type === "function" || (type === "object" && value !== null);
}

exports.isObjectLike = isObjectLike;
