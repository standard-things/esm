#!/usr/bin/env bash

set -e
set -u

cd $(dirname $0)

mocha \
    --require reify \
    --reporter spec \
    --full-trace \
    tests.js
