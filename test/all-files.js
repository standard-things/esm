import { join } from "path";
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
    } else if (/\.js$/i.test(item) &&
               stat.isFile()) {
      files[absPath] = readFileSync(absPath, "utf8");
    }
  });
}

walk(__dirname);
