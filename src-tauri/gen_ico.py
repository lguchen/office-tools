import struct
import os

def create_bmp_32bpp(size):
    def pixel(x, y, s):
        cx = s / 2
        cy = s / 2
        dx = x - cx
        dy = y - cy
        dist = (dx*dx + dy*dy) ** 0.5
        radius = s * 0.42
        if dist < radius:
            return (59, 130, 246, 255)
        elif dist < radius + 1.5:
            alpha = int(255 * (radius + 1.5 - dist) / 1.5)
            return (59, 130, 246, max(0, min(255, alpha)))
        else:
            return (0, 0, 0, 0)

    pixel_data = bytearray()
    and_mask = bytearray()
    row_bytes = (size * 4 + 3) & ~3
    and_row_bytes = ((size + 31) // 32) * 4
    
    for y in range(size-1, -1, -1):
        for x in range(size):
            r, g, b, a = pixel(x, y, size)
            pixel_data.extend([b, g, r, a])
        # padding
        while len(pixel_data) % 4 != 0:
            pixel_data.append(0)
    
    for y in range(size-1, -1, -1):
        row_bits = 0
        for x in range(size):
            _, _, _, a = pixel(x, y, size)
            if a < 128:
                row_bits |= (1 << (31 - (x % 32)))
            if x % 32 == 31:
                and_mask.extend(struct.pack('>I', row_bits))
                row_bits = 0
        if size % 32 != 0:
            and_mask.extend(struct.pack('>I', row_bits))
    
    bmp_size = 40 + len(pixel_data) + len(and_mask)
    file_size = 14 + bmp_size
    
    bmp = bytearray()
    bmp.extend(b'BM')
    bmp.extend(struct.pack('<I', file_size))
    bmp.extend(struct.pack('<HH', 0, 0))
    bmp.extend(struct.pack('<I', 14 + 40))
    bmp.extend(struct.pack('<I', 40))
    bmp.extend(struct.pack('<ii', size, size * 2))
    bmp.extend(struct.pack('<HH', 1, 32))
    bmp.extend(struct.pack('<I', 0))
    bmp.extend(struct.pack('<I', len(pixel_data)))
    bmp.extend(struct.pack('<I', 2835))
    bmp.extend(struct.pack('<I', 2835))
    bmp.extend(struct.pack('<I', 0))
    bmp.extend(struct.pack('<I', 0))
    bmp.extend(pixel_data)
    bmp.extend(and_mask)
    
    return bytes(bmp)

def create_ico(sizes):
    bmp_list = [(s, create_bmp_32bpp(s)) for s in sizes]
    
    num = len(bmp_list)
    data = struct.pack('<HHH', 0, 1, num)
    offset = 6 + 16 * num
    
    entries = b''
    bmp_datas = b''
    
    for size, bmp in bmp_list:
        w = size if size < 256 else 0
        h = size if size < 256 else 0
        entry = struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(bmp), offset)
        entries += entry
        bmp_datas += bmp
        offset += len(bmp)
    
    return data + entries + bmp_datas

os.makedirs('icons', exist_ok=True)

ico_data = create_ico([16, 32, 48, 64, 128, 256])
with open('icons/icon.ico', 'wb') as f:
    f.write(ico_data)
print('Created icon.ico (BMP format)')
print('Done!')
