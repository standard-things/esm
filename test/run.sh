#!/usr/bin/env bash

set -e
set -u

cd $(dirname "$0")
TEST_DIR=$(pwd)

cd "$TEST_DIR"

rm -rf .cache
export REIFY_PARSER=acorn

mocha \
    --require "../index.js" \
    --full-trace \
    run.js

# Run tests again using test/.cache.
mocha \
    --require "../index.js" \
    --full-trace \
    run.js
