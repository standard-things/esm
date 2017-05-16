import assert from "assert";
import { gzip } from "../node/fs.js";
import { join } from "path";
import {
  readFileSync,
  writeFileSync
} from "fs";

const fixturePath = join(__dirname, "file-extension");
const content = readFileSync(join(fixturePath, "a.mjs"));

describe("file extension", () => {
  function check(modulePath) {
    let exported;

    try {
      exported = require(modulePath).default;
    } catch (e) {}

    assert.strictEqual(exported, "a");
  }

  [".gz", ".js.gz", ".mjs.gz", ".mjs"].forEach((ext) => {
    it(`compiles ${ext} files`, () => {
      const modulePath = join(fixturePath, "a" + ext);
      if (ext.includes(".gz")) {
        writeFileSync(modulePath, gzip(content));
      }
      check(modulePath);
    });
  });
});
