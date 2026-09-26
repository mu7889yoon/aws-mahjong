#!/usr/bin/env python3
"""Export Labelme rectangle sidecars into Ultralytics YOLO detection labels."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = REPO_ROOT / "dataset" / "aws-mahjong"
SPLITS = ("train", "val", "test")
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


def load_classes(path: Path) -> dict[str, int]:
    names = [line.strip() for line in path.read_text(encoding="utf-8").splitlines()]
    names = [name for name in names if name]
    if len(names) != len(set(names)):
        raise ValueError(f"duplicate class name in {path}")
    return {name: index for index, name in enumerate(names)}


def yolo_row(shape: dict[str, Any], class_ids: dict[str, int], width: int, height: int) -> str:
    label = shape.get("label")
    if label not in class_ids:
        raise ValueError(f"unknown class label: {label!r}")
    if shape.get("shape_type") != "rectangle":
        raise ValueError(f"expected rectangle shape, got {shape.get('shape_type')!r}")
    points = shape.get("points") or []
    if len(points) != 2:
        raise ValueError("rectangle must have exactly two corner points")
    (x0, y0), (x1, y1) = points
    left, right = sorted((float(x0), float(x1)))
    top, bottom = sorted((float(y0), float(y1)))
    if width <= 0 or height <= 0 or left < 0 or top < 0 or right > width or bottom > height:
        raise ValueError(f"rectangle outside image bounds ({width}x{height}): {points}")
    if left == right or top == bottom:
        raise ValueError(f"zero-area rectangle: {points}")
    cx = ((left + right) / 2) / width
    cy = ((top + bottom) / 2) / height
    box_width = (right - left) / width
    box_height = (bottom - top) / height
    return f"{class_ids[label]} {cx:.6f} {cy:.6f} {box_width:.6f} {box_height:.6f}"


def export(dataset: Path) -> int:
    class_ids = load_classes(dataset / "classes.txt")
    exported = 0
    for split in SPLITS:
        images_dir = dataset / "images" / split
        labels_dir = dataset / "labels" / split
        labels_dir.mkdir(parents=True, exist_ok=True)
        for annotation_path in sorted(images_dir.glob("*.json")):
            annotation = json.loads(annotation_path.read_text(encoding="utf-8"))
            if annotation.get("imageData") is not None:
                raise ValueError(
                    f"embedded image data found in {annotation_path}; "
                    "save Labelme JSON without --with-image-data"
                )
            image_name = str(annotation.get("imagePath", ""))
            if not image_name or Path(image_name).name != image_name:
                raise ValueError(f"imagePath must be a relative filename in {annotation_path}")
            image_path = images_dir / image_name
            if image_path.suffix.lower() not in IMAGE_EXTENSIONS or not image_path.is_file():
                raise FileNotFoundError(f"missing source image for {annotation_path}: {image_path}")
            width = int(annotation.get("imageWidth", 0))
            height = int(annotation.get("imageHeight", 0))
            rows = [
                yolo_row(shape, class_ids, width, height)
                for shape in annotation.get("shapes", [])
            ]
            output_path = labels_dir / f"{image_path.stem}.txt"
            output_path.write_text("\n".join(rows) + ("\n" if rows else ""), encoding="utf-8")
            exported += 1
    print(f"Exported {exported} annotations under {dataset / 'labels'}")
    return exported


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", nargs="?", type=Path, default=DEFAULT_DATASET)
    args = parser.parse_args()
    export(args.dataset.resolve())


if __name__ == "__main__":
    main()
