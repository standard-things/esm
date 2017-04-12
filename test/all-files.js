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

export const files = Object.create(null);

function walk(dir) {
  readdirSync(dir).forEach((item) => {
    const absPath = join(dir, item);
    const stat = statSync(absPath);
    if (stat.isDirectory()) {
      walk(absPath);
    } else if (stat.isFile()) {
      const relPath = relative(__dirname, absPath);
      const relParts = relPath.split(sep);

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
