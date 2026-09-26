#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
split="${1:-test}"

case "$split" in
  train|val|test|unassigned) ;;
  *)
    echo "Usage: $0 [unassigned|train|val|test]" >&2
    exit 2
    ;;
esac

images_dir="$repo_root/dataset/aws-mahjong/images/$split"
classes_file="$repo_root/dataset/aws-mahjong/classes.txt"

exec labelme "$images_dir" --labels "$classes_file"
