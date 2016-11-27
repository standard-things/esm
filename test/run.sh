#!/usr/bin/env bash

set -e
set -u

cd $(dirname $0)

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
