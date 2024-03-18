#!/bin/bash
for filename in src/packs/*; do
  f=$(basename -- "$filename")
  fvtt package --in ./src/packs/"${f}" --out ./packs/ -n "${f}" --type Module pack "${f}"
done