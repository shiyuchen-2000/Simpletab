"""生成浏览器扩展图标（16/32/48/128/300）：对角渐变圆角底 + 平滑 S 标识（300 为商店 Logo）"""
import os
from PIL import Image, ImageDraw, ImageFilter

# 品牌色：左上亮青绿 -> 右下深青
ACCENT = (64, 210, 199)
DEEP = (20, 104, 110)
SIZES = [16, 32, 48, 128, 300]

out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'icons')
os.makedirs(out_dir, exist_ok=True)


def make_icon(size):
    # 4 倍超采样，最后缩回，保证弧线平滑
    S = 8
    n = size * S

    # 1. 对角渐变底色
    base = Image.new('RGB', (n, n))
    px = base.load()
    denom = 2 * (n - 1) if n > 1 else 1
    for y in range(n):
        for x in range(n):
            t = (x + y) / denom
            t = t * t * (3 - 2 * t)
            px[x, y] = tuple(int(ACCENT[k] + (DEEP[k] - ACCENT[k]) * t) for k in range(3))

    # 2. 圆角遮罩
    radius = n * 0.22
    mask = Image.new('L', (n, n), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, n - 1, n - 1], radius=radius, fill=255)

    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    img.paste(base, (0, 0), mask)
    draw = ImageDraw.Draw(img)

    # 3. 极细内高光描边
    bw = max(1, int(round(n * 0.018)))
    draw.rounded_rectangle(
        [bw / 2, bw / 2, n - 1 - bw / 2, n - 1 - bw / 2],
        radius=radius - bw / 2,
        outline=(255, 255, 255, 60),
        width=bw,
    )

    # 4. 平滑 S：先采样一条连续 S 曲线，再构造等宽轮廓多边形填充，避免粗线接头毛刺
    line_w = n * 0.17                 # 笔画粗细
    top = n * 0.20
    mid = n * 0.5
    bot = n * 0.80
    hw = n * 0.30                     # 横向展开宽度
    white = (255, 255, 255, 255)

    def cubic(p0, p1, p2, p3, steps=120):
        pts = []
        for i in range(steps + 1):
            t = i / steps
            mt = 1 - t
            x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
            y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
            pts.append((x, y))
        return pts

    cx = n / 2
    seg1 = cubic((cx, top), (cx + hw, top), (cx + hw, mid), (cx, mid))
    seg2 = cubic((cx, mid), (cx - hw, mid), (cx - hw, bot), (cx, bot))
    center = seg1 + seg2[1:]

    # 按切线法向量构造左右两侧轮廓，再合并成闭合多边形
    half = line_w / 2
    left, right = [], []
    n_pts = len(center)
    for i, (x, y) in enumerate(center):
        x0, y0 = center[max(0, i - 1)]
        x1, y1 = center[min(n_pts - 1, i + 1)]
        dx, dy = x1 - x0, y1 - y0
        length = (dx * dx + dy * dy) ** 0.5 or 1
        nx, ny = -dy / length, dx / length   # 法向量
        left.append((x + nx * half, y + ny * half))
        right.append((x - nx * half, y - ny * half))

    outline = left + right[::-1]
    draw.polygon(outline, fill=white)

    # 端点圆头，让首尾圆润
    for ex, ey in [center[0], center[-1]]:
        draw.ellipse([ex - half, ey - half, ex + half, ey + half], fill=white)

    # 轻微模糊柔化多边形边缘，再缩回原尺寸
    return img.filter(ImageFilter.GaussianBlur(radius=S * 0.12)).resize((size, size), Image.LANCZOS)


for s in SIZES:
    p = os.path.join(out_dir, f'icon{s}.png')
    make_icon(s).save(p)
    print(f'icon{s}.png -> {p}')
print('done')
