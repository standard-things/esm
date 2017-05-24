"use strict";

module.exports = Object.assign(Object.create(null),
  typeof process === "object" && process !== null &&
  typeof process.env === "object" && process.env !== null &&
  process.env
);
