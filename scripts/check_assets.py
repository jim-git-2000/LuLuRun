"""Check packaged resources using only Python's standard library."""
import hashlib
import json
from pathlib import Path
import re
import struct
import xml.etree.ElementTree as ET
from png_alpha import alpha_bounds

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
assert 0 < runner['strideMeters'] < 30
assert set(runner['phaseEnds']) == {'jump', 'slide'}
for name, ends in runner['phaseEnds'].items():
    assert len(ends) == len(runner['groups'][name])
    assert ends[-1] == 1 and all(a < b for a, b in zip([0] + ends, ends))
expected_files = set()
for name, frames in runner['groups'].items():
    for frame in frames:
        assert re.fullmatch(r'lulu_(run|jump|slide)_\d{2}\.png', frame['file'])
        assert frame['file'] not in expected_files, 'Duplicate animation frame'
        expected_files.add(frame['file'])
        path = GAME / 'runner' / frame['file']
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == frame['sha256'], path
        assert data[:8] == b'\x89PNG\r\n\x1a\n', path
        assert struct.unpack('>II', data[16:24]) == (runner['width'], runner['height']), path
        assert data[25] == 6, f'{path} must be RGBA PNG'
        assert 0 < frame['anchorY'] <= runner['height'], path
        assert 0 < frame['anchorX'] < runner['width'], path
        bounds = alpha_bounds(data, runner['anchorThreshold'])
        assert bounds == frame['bounds'], f'{path}: stale alpha bounds'
        assert 0 < bounds[0] < bounds[2] < runner['width'], f'{path}: horizontal clipping'
        assert 0 < bounds[1] < bounds[3] < runner['height'], f'{path}: vertical clipping'
assert expected_files == {p.name for p in (GAME / 'runner').glob('*.png')}, 'Unlisted runner images'

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
assert "connect-src 'self'" in html, 'Local manifests must be loadable under CSP'
assert "readManifest('runner/manifest.json')" in script
assert "readManifest('pet/manifest.json')" in script
for path in ROOT.rglob('*.md'):
    if '.git' in path.parts:
        continue
    content = path.read_text()
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', content):
        if '://' not in target and not target.startswith('#'):
            assert (path.parent / target.split('#')[0]).exists(), f'{path}: broken link {target}'
print(f'OK: {sum(map(len, manifest.values()))} home frames, 16 rear runner frames, PNG alpha/CRC, animation manifests, XML, DOM, offline assets, Markdown links')
