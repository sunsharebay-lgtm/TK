"""Check the actual atlas pixels, not just the PNG header. Requires Pillow."""

from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets/blender/tank-sprites-v2.png"
image = Image.open(path).convert("RGBA")
tile = image.width // 8
assert image.size == (tile * 8, tile * 9)
failures = []

for row in range(9):
    for col in range(8):
        frame = image.crop((col * tile, row * tile, (col + 1) * tile, (row + 1) * tile))
        mask = frame.getchannel("A").point(lambda alpha: 255 if alpha > 128 else 0)
        bounds = mask.getbbox()
        label = f"skin={row} tread={col // 4} dir={col % 4}"
        if not bounds:
            failures.append(f"{label}: empty frame")
            continue
        left, top, right, bottom = bounds
        if min(left, top, tile - right, tile - bottom) < 2:
            failures.append(f"{label}: silhouette touches cell border {bounds}")
        # A tank's center must be solid armor, not the gap between four fragments.
        center = mask.crop((tile // 2 - 2, tile // 2 - 2, tile // 2 + 2, tile // 2 + 2))
        if min(center.getdata()) != 255:
            failures.append(f"{label}: missing tank center")
        # Every opaque pixel belongs to one connected silhouette.
        points = {(x, y) for y in range(tile) for x in range(tile) if mask.getpixel((x, y))}
        remaining = set(points)
        stack = [remaining.pop()]
        while stack:
            x, y = stack.pop()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                neighbor = (x + dx, y + dy)
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    stack.append(neighbor)
        if len(remaining) > len(points) * 0.01:
            failures.append(f"{label}: disconnected tank fragments ({len(remaining)} pixels)")
        # Rotate back to up. The muzzle is narrow; the rear includes both tracks.
        upright = mask.rotate((col % 4) * 90)
        box = upright.getbbox()
        front_y = box[1] + max(1, tile // 40)
        rear_y = box[3] - max(2, tile // 30)
        front = sum(bool(upright.getpixel((x, front_y))) for x in range(tile))
        rear = sum(bool(upright.getpixel((x, rear_y))) for x in range(tile))
        if not 0 < front < rear:
            failures.append(f"{label}: cannon direction/outline invalid (front={front}, rear={rear})")

if failures:
    print("\n".join(failures[:16]))
    raise SystemExit(f"BLENDER_PIXELS_FAILED: {len(failures)} checks")
print(f"BLENDER_PIXELS_OK: 72 complete centered silhouettes, transparent margins and cannon directions ({tile}px)")
