"""Generate SJ Hub PWA icons (192/512 + maskable) with pure stdlib PNG writing."""
import zlib, struct, math

def png_write(path, size, px):
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    raw = b''.join(b'\x00' + b''.join(bytes(px(x, y)) for x in range(size)) for y in range(size))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    open(path, 'wb').write(png)

NAVY = (18, 59, 93)        # #123B5D
CYAN = (8, 126, 154)       # #087E9A
CYAN_L = (103, 213, 235)   # #67D5EB (dark-theme accent)
WHITE = (255, 255, 255)

def make(size, maskable=False):
    margin = size * 0.10 if maskable else size * 0.05
    cx = cy = size / 2
    r = size / 2 - margin
    def px(x, y):
        # rounded-square / circle base (use rounded rect: cheap = circle)
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        # Rounded square via SDF
        half = size / 2 - margin
        qx, qy = abs(dx) - (half - r * 0.55), abs(dy) - (half - r * 0.55)
        outside = math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r * (0.75 if False else (r * 0.45 if maskable else r * 0.30))
        if maskable:
            outside = math.hypot(dx, dy) - (size / 2 - size * 0.16)  # keep clear zone
        if outside > 0:
            return (0, 0, 0)
        # 4-20 mA needle: diagonal line from bottom-left to top-right + arc dot
        on = False
        # diagonal band
        d0 = (y / size) - (x / size)
        if abs(d0 - 0.12) < 0.028:
            on = True
        # dot at 80% along the line (live reading)
        tx, ty = size * 0.32, size * 0.72
        if math.hypot(x + 0.5 - tx, y + 0.5 - ty) < size * 0.075:
            on = True
        # horizontal "scale" ticks top-left
        for i, (txx, tyy) in enumerate([(0.28, 0.30), (0.42, 0.20), (0.56, 0.34)]):
            if abs(x / size - txx) < 0.045 and abs(y / size - tyy) < 0.014:
                on = True
        if on:
            return CYAN_L if not maskable else WHITE
        return NAVY if not maskable else NAVY
    return px

for s in (192, 512):
    png_write(f'assets/icons/icon-{s}.png', s, make(s))
png_write('assets/icons/icon-512-maskable.png', 512, make(512, maskable=True))
print('icons written')
