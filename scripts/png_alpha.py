"""Read RGBA PNG alpha bounds without an imaging dependency (no image edits)."""
import struct
import zlib


def alpha_bounds(data, threshold=64):
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'Not a PNG'
    width, height, depth, color, compression, filtering, interlace = struct.unpack('>IIBBBBB', data[16:29])
    assert (depth, color, compression, filtering, interlace) == (8, 6, 0, 0, 0), 'Expected non-interlaced RGBA8'
    offset, compressed, ended = 8, bytearray(), False
    while offset < len(data):
        length = struct.unpack('>I', data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + length]
        crc = struct.unpack('>I', data[offset + 8 + length:offset + 12 + length])[0]
        assert zlib.crc32(kind + payload) == crc, 'Invalid PNG CRC'
        if kind == b'IDAT':
            compressed.extend(payload)
        offset += length + 12
        if kind == b'IEND':
            ended = True
            break
    assert ended and offset == len(data), 'Incomplete PNG or trailing bytes'
    raw = zlib.decompress(compressed)
    stride = width * 4 + 1
    assert len(raw) == stride * height, 'Invalid pixel data length'
    previous = bytearray(width)
    left, top, right, bottom = width, height, -1, -1
    transparent = False
    for y in range(height):
        start = y * stride
        mode = raw[start]
        assert mode <= 4, 'Invalid PNG filter'
        row = bytearray(raw[start + 4:start + stride:4])
        # PNG filters work independently per channel; reconstruct alpha only.
        for x in range(width):
            a = row[x - 1] if x else 0
            b = previous[x]
            c = previous[x - 1] if x else 0
            if mode == 1:
                prediction = a
            elif mode == 2:
                prediction = b
            elif mode == 3:
                prediction = (a + b) // 2
            elif mode == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                prediction = a if pa <= pb and pa <= pc else b if pb <= pc else c
            else:
                prediction = 0
            row[x] = (row[x] + prediction) & 255
            if row[x] == 0:
                transparent = True
            if row[x] >= threshold:
                left, right = min(left, x), max(right, x)
                top, bottom = min(top, y), max(bottom, y)
        previous = row
    assert transparent and right >= left, 'Expected a visible subject on transparent background'
    return [left, top, right + 1, bottom + 1]
