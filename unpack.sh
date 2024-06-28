for filename in src/packs/*; do
  f=$(basename -- "$filename")
  fvtt package --in ./packs --out ./src/packs/"${f}" -n "${f}" --type Module unpack "${f}"
done