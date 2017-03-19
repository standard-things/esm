import {
  join,
  relative,
  sep,
} from "path";

import {
  readdirSync,
  readFileSync,
  statSync,
} from "fs";

export var files = Object.create(null);

function walk(dir) {
  readdirSync(dir).forEach(function (item) {
    var absPath = join(dir, item);
    var stat = statSync(absPath);
    if (stat.isDirectory()) {
      walk(absPath);
    } else if (stat.isFile()) {
      var relPath = relative(__dirname, absPath);
      var relParts = relPath.split(sep);

      // Ignore cache files.
      if (relParts[0] === ".cache") {
        return;
      }

      // Ignore non-.js files.
      if (! /\.js$/.test(relPath)) {
        return;
      }

      files[absPath] = readFileSync(absPath, "utf8");
    }
  });
}

walk(__dirname);
