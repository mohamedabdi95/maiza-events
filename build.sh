#!/bin/sh
# Rebuilds js/scene.bundle.js after editing js/scene.js. Needs esbuild (https://esbuild.github.io).
cd "$(dirname "$0")" || exit 1
"${ESBUILD:-esbuild}" js/scene.js --bundle --format=iife --minify --target=es2019 \
  --alias:three/addons=./vendor/three/addons \
  --alias:three=./vendor/three/three.module.min.js \
  --outfile=js/scene.bundle.js
