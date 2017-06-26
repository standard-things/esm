#!/usr/bin/env bash

set -e
set -u

cd $(dirname "$0")
TEST_DIR=$(pwd)

cd "$TEST_DIR"

rm -rf .cache node_modules/enabled/.esm-cache

mocha \
    --require "../dist/esm.js" \
    --full-trace \
    tests.js

# Run tests again using test/.cache.
mocha \
    --require "../dist/esm.js" \
    --full-trace \
    tests.js
