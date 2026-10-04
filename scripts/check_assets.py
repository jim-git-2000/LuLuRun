"""Check packaged resources using only Python's standard library."""
import hashlib
import json
from pathlib import Path
import re
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'app/src/main/assets/game'
manifest = json.loads((GAME / 'pet/manifest.json').read_text())
assert set(manifest) == {'idle'}
for name, frames in manifest.items():
    assert len(frames) == 12, name
    for frame in frames:
        path = GAME / 'pet' / frame['file']
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == frame['sha256'], path
        assert data[:8] == b'\x89PNG\r\n\x1a\n', path
        assert struct.unpack('>II', data[16:24]) == (512, 512), path

runner = json.loads((GAME / 'runner/manifest.json').read_text())
assert set(runner['groups']) == {'run', 'jump', 'slide'}
assert [len(runner['groups'][name]) for name in ('run', 'jump', 'slide')] == [8, 4, 4]
for name, frames in runner['groups'].items():
    for frame in frames:
        path = GAME / 'runner' / frame['file']
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == frame['sha256'], path
        assert data[:8] == b'\x89PNG\r\n\x1a\n', path
        assert struct.unpack('>II', data[16:24]) == (runner['width'], runner['height']), path
        assert data[25] == 6, f'{path} must be RGBA PNG'
        assert 0 < frame['anchorY'] <= runner['height'], path

for path in (ROOT / 'app/src/main').rglob('*.xml'):
    ET.parse(path)

html = (GAME / 'index.html').read_text()
ids = re.findall(r'\bid="([^"]+)"', html)
assert len(ids) == len(set(ids)), 'Duplicate HTML IDs'
script = (GAME / 'game.js').read_text()
for name in re.findall(r"\$\('([^']+)'\)", script):
    assert name in ids, f'Missing DOM element: {name}'
for path in re.findall(r'(?:src|href)="([^"#]+)"', html):
    assert (GAME / path).is_file(), f'Missing local resource: {path}'
android = (ROOT / 'app/src/main/AndroidManifest.xml').read_text()
assert 'android.permission.INTERNET' not in android
assert 'uses-permission' not in android
assert 'https://' not in html, 'Game must not depend on remote assets'
print(f'OK: {sum(map(len, manifest.values()))} home frames, 16 rear runner frames, XML, DOM references, offline assets')
