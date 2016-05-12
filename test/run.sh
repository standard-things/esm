#!/usr/bin/env bash

set -e
set -u

cd $(dirname $0)

mocha \
    --require "../node" \
    --reporter spec \
    --full-trace \
    tests.js
