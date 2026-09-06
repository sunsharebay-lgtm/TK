"""Make an explicitly labeled atlas-crop comparison, not a gameplay screenshot."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
before = Image.open(root / "历史版本/v1.7.0-blender-初稿/tank-sprites-v1.png").convert("RGBA")
after = Image.open(root / "assets/blender/tank-sprites-v2.png").convert("RGBA")
board = Image.new("RGB", (760, 340), "#141b24")
draw = ImageDraw.Draw(board)
draw.text((20, 16), "ATLAS CROP COMPARISON - NOT A GAMEPLAY SCREENSHOT", fill="white")
draw.text((20, 48), "BEFORE: misaligned / 32px intermediate", fill="#ffafaf")
draw.text((396, 48), "AFTER: centered / 128px source", fill="#9ae2b2")
for row, label in enumerate(["P1", "P2", "BASIC"]):
    draw.text((8, 97 + row * 80), label, fill="white")
    for col in range(4):
        old = before.crop((col * 96, row * 96, (col + 1) * 96, (row + 1) * 96))
        old = old.resize((32, 32), Image.Resampling.NEAREST).resize((64, 64), Image.Resampling.NEAREST)
        new = after.crop((col * 128, row * 128, (col + 1) * 128, (row + 1) * 128))
        new = new.resize((64, 64), Image.Resampling.LANCZOS)
        board.paste(old, (56 + col * 80, 80 + row * 80), old)
        board.paste(new, (416 + col * 80, 80 + row * 80), new)
board.save(root / "测试/blender-before-after.png")
print("Wrote 测试/blender-before-after.png")
