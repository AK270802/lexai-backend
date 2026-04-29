from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, List, Optional, Tuple


@dataclass(frozen=True)
class Rect:
    x: float
    y: float
    width: float
    height: float

    @property
    def x2(self) -> float:
        return self.x + self.width

    @property
    def y2(self) -> float:
        return self.y + self.height


def _as_float_tuple(bbox: Any) -> Optional[Tuple[float, float, float, float]]:
    if bbox is None:
        return None
    if isinstance(bbox, dict):
        keys = {k.lower() for k in bbox.keys()}
        if {'x', 'y', 'width', 'height'}.issubset(keys):
            return (
                float(bbox['x']),
                float(bbox['y']),
                float(bbox['width']),
                float(bbox['height']),
            )
    if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
        try:
            return (float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3]))
        except (TypeError, ValueError):
            return None
    return None


def docling_bbox_to_rect(bbox: Any) -> Optional[Rect]:
    raw = _as_float_tuple(bbox)
    if raw is None:
        return None
    a, b, c, d = raw
    if c > a and d > b:
        return Rect(x=a, y=b, width=c - a, height=d - b)
    if c >= 0 and d >= 0:
        return Rect(x=a, y=b, width=c, height=d)
    return None


def merge_rects(rects: Iterable[Rect], pad: float = 2.0) -> List[Rect]:
    rects_list = sorted(list(rects), key=lambda r: (r.y, r.x))
    merged: List[Rect] = []
    for r in rects_list:
        if not merged:
            merged.append(r)
            continue
        last = merged[-1]

        overlaps_x = not (r.x > last.x2 + pad or r.x2 + pad < last.x)
        overlaps_y = not (r.y > last.y2 + pad or r.y2 + pad < last.y)
        if overlaps_x and overlaps_y:
            x1 = min(last.x, r.x)
            y1 = min(last.y, r.y)
            x2 = max(last.x2, r.x2)
            y2 = max(last.y2, r.y2)
            merged[-1] = Rect(x=x1, y=y1, width=x2 - x1, height=y2 - y1)
        else:
            merged.append(r)
    return merged


def rect_to_dict(rect: Rect) -> dict:
    return {"x": rect.x, "y": rect.y, "width": rect.width, "height": rect.height}
