import struct
import zlib
import os

def create_png_rgba(size, pixels_func):
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc
    
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    
    raw_data = b''
    for y in range(size):
        raw_data += b'\x00'
        for x in range(size):
            r, g, b, a = pixels_func(x, y, size)
            raw_data += bytes([r, g, b, a])
    
    idat = zlib.compress(raw_data, 9)
    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

def circle_pixel(x, y, size):
    cx = size / 2
    cy = size / 2
    dx = x - cx
    dy = y - cy
    dist = (dx*dx + dy*dy) ** 0.5
    radius = size * 0.42
    if dist < radius:
        return (59, 130, 246, 255)
    elif dist < radius + 1:
        alpha = int(255 * (radius + 1 - dist))
        return (59, 130, 246, max(0, min(255, alpha)))
    else:
        return (0, 0, 0, 0)

os.makedirs('icons', exist_ok=True)

sizes = [16, 32, 48, 64, 128, 256]
png_list = []
for s in sizes:
    png = create_png_rgba(s, circle_pixel)
    png_list.append((s, png))
    if s == 32:
        with open('icons/32x32.png', 'wb') as f:
            f.write(png)
    elif s == 128:
        with open('icons/128x128.png', 'wb') as f:
            f.write(png)
    elif s == 256:
        with open('icons/128x128@2x.png', 'wb') as f:
            f.write(png)

def make_ico_with_png(png_list):
    num = len(png_list)
    data = struct.pack('<HHH', 0, 1, num)
    offset = 6 + 16 * num
    
    entries = b''
    png_datas = b''
    
    for size, png in png_list:
        w = size if size < 256 else 0
        h = size if size < 256 else 0
        entry = struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(png), offset)
        entries += entry
        png_datas += png
        offset += len(png)
    
    return data + entries + png_datas

ico_data = make_ico_with_png(png_list)
with open('icons/icon.ico', 'wb') as f:
    f.write(ico_data)
print('Created icon.ico with PNG format')

with open('icons/icon.icns', 'wb') as f:
    f.write(png_list[-1][1])
print('Created icon.icns')
print('Done!')
