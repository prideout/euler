from pathlib import Path

import snowy

PREFIX = "screenshot_3d_"

p = Path(".")
files = [x for x in p.glob("screenshot_3d_*.png")]
files = sorted(files)
for file3d in files:
    suffix = str(file3d)[len(PREFIX):]
    panel = suffix[0]
    value = suffix[4:6]
    file2d = f"screenshot_2d_{panel}_0.{value}.png"
    print(file2d, str(file3d))
    file_composed = f"img{panel}_{value}.png"
    image2d = snowy.load(file2d)
    image3d = snowy.load(str(file3d))
    composed = snowy.compose(image3d, image2d)
    snowy.export(composed, file_composed)
