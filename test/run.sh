#!/usr/bin/env bash

set -e
set -u

TEST_DIR=$(dirname "$0")
PKG_DIR=$(dirname "$TEST_DIR")

cd "$PKG_DIR"
npm link packages/babel-plugin-transform-es2015-modules-reify
rm -rf node_modules/babel-plugin-transform-es2015-modules-reify/node_modules/reify
rm -rf node_modules/reify
ln -s . node_modules/reify

cd "$TEST_DIR"

rm -rf .cache
export REIFY_PARSER=babylon

mocha \
    --require "../node" \
    --reporter spec \
    --full-trace \
    run.js

rm -rf .cache
export REIFY_PARSER=acorn

mocha \
    --require "../node" \
    --reporter spec \
    --full-trace \
    run.js

# Run tests again using test/.cache.
mocha \
    --require "../node" \
    --reporter spec \
    --full-trace \
    run.js
