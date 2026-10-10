"""Optional real-browser smoke checks; uses installed Firefox/geckodriver only."""
import argparse
import shutil
import socket
import tempfile
import base64
import functools
import http.server
import json
from pathlib import Path
import subprocess
import threading
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description='使用已安装 Firefox 检查游戏；不下载浏览器或依赖。')
parser.add_argument('--firefox')
parser.add_argument('--geckodriver')
args = parser.parse_args()
def binary(explicit, name):
    snap = Path('/snap/firefox/current/usr/lib/firefox') / name
    value = explicit or (str(snap) if snap.is_file() else shutil.which(name))
    if not value:
        parser.error(f'未找到 {name}；可跳过此可选检查，不会自动安装。')
    return value
firefox = binary(args.firefox, 'firefox')
geckodriver = binary(args.geckodriver, 'geckodriver')
artifacts = Path(tempfile.mkdtemp(prefix='lulur-run-browser-', dir='/tmp'))
with socket.socket() as probe:
    probe.bind(('127.0.0.1', 0))
    driver_port = probe.getsockname()[1]
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT / 'app/src/main/assets/game')))
threading.Thread(target=server.serve_forever, daemon=True).start()
log = (artifacts / 'webdriver.log').open('w')
driver = subprocess.Popen([geckodriver, '--host', '127.0.0.1', '--port', str(driver_port), '--profile-root', str(artifacts)], stdout=log, stderr=log)
base = f'http://127.0.0.1:{driver_port}'
session = None

def request(method, path, data=None):
    req = urllib.request.Request(base + path, data=json.dumps(data).encode() if data is not None else None, headers={'Content-Type': 'application/json'}, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.load(response)
    value = result.get('value')
    if isinstance(value, dict) and 'error' in value: raise RuntimeError(value)
    return value

def js(script):
    return request('POST', f'/session/{session}/execute/sync', {'script': script, 'args': []})

def check(script, title):
    assert js('return ' + script), title
    print('PASS', title, flush=True)

def shot(name):
    element = request('POST', f'/session/{session}/element', {'using': 'css selector', 'value': '#app'})
    element_id = next(iter(element.values()))
    data = request('GET', f'/session/{session}/element/{element_id}/screenshot')
    (artifacts / (name + '.png')).write_bytes(base64.b64decode(data))

try:
    for _ in range(100):
        try:
            request('GET', '/status'); break
        except Exception: time.sleep(.1)
    caps = {'capabilities': {'alwaysMatch': {'browserName': 'firefox', 'moz:firefoxOptions': {'binary': firefox, 'args': ['-headless'], 'prefs': {'media.autoplay.default': 0}}}}}
    session = request('POST', '/session', caps)['sessionId']
    request('POST', f'/session/{session}/window/rect', {'width': 390, 'height': 930})
    request('POST', f'/session/{session}/url', {'url': f'http://127.0.0.1:{server.server_port}'})
    for _ in range(100):
        if js('return !document.getElementById("start").disabled'): break
        time.sleep(.1)
    check('!document.getElementById("start").disabled', 'all frames loaded')
    js('document.getElementById("app").style.width="390px"; window.dispatchEvent(new Event("resize"))')
    js('window.testErrors=[]; window.addEventListener("error", e=>testErrors.push(e.message)); document.getElementById("controls-toggle").click();')
    shot('home')
    js('document.getElementById("help-open").click()')
    check('!document.getElementById("help-screen").hidden', 'help opens')
    js('document.getElementById("help-close").click(); document.getElementById("start").click()')
    time.sleep(.4)
    check('Number(document.getElementById("distance").textContent)>0', 'run advances')
    check('!document.getElementById("touch-controls").hidden', 'optional controls enabled')
    shot('running')
    js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowUp"}))')
    time.sleep(.25)
    shot('jump')
    time.sleep(1)
    js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowDown"}))')
    time.sleep(.25)
    shot('slide')
    js('document.getElementById("pause").click(); window.savedDistance=document.getElementById("distance").textContent')
    time.sleep(.5)
    check('document.getElementById("distance").textContent===savedDistance && !document.getElementById("pause-screen").hidden', 'pause freezes game')
    shot('paused')
    js('document.dispatchEvent(new KeyboardEvent("keydown", {key:"Escape", repeat:true}))')
    check('!document.getElementById("pause-screen").hidden && document.getElementById("countdown").hidden', 'held Escape does not resume')
    js('window.dispatchEvent(new PageTransitionEvent("pagehide", {persisted:true}))')
    check('JSON.parse(localStorage.getItem("lulu.run.v1")).runs===0', 'cached page is not settled prematurely')
    js('document.getElementById("resume").click()')
    check('!document.getElementById("countdown").hidden', 'resume starts countdown')
    js('window.pauseGame()')
    check('document.getElementById("countdown").hidden && !document.getElementById("pause-screen").hidden', 'background during countdown remains recoverable')
    js('document.getElementById("resume").click()')
    time.sleep(3.4)
    check('document.getElementById("pause-screen").hidden && document.getElementById("countdown").hidden', 'countdown resumes running')
    for _ in range(70):
        if js('return !document.getElementById("result-screen").hidden'): break
        time.sleep(.1)
    check('!document.getElementById("result-screen").hidden', 'collision shows results')
    check('Number(document.getElementById("result-score").textContent)>0', 'result score populated')
    shot('results')
    js('document.getElementById("retry").click()')
    time.sleep(.1)
    check('document.getElementById("result-screen").hidden && document.getElementById("coins").textContent==="0"', 'retry resets run')
    js('document.dispatchEvent(new KeyboardEvent("keydown", {key:"W"}))')
    time.sleep(.1)
    shot('uppercase-jump')
    js('document.getElementById("pause").click(); document.getElementById("quit").click()')
    check('!document.getElementById("home").hidden', 'quit returns home')
    check('JSON.parse(localStorage.getItem("lulu.run.v1")).runs===2', 'each completed run saved once')
    js('document.querySelector(".sound-button").click()')
    check('JSON.parse(localStorage.getItem("lulu.run.v1")).sound===false', 'mute persisted')
    check('window.testErrors.length===0', 'no browser runtime errors')
    request('POST', f'/session/{session}/refresh', {})
    for _ in range(150):
        if js('return !document.getElementById("start").disabled'): break
        time.sleep(.1)
    check('document.querySelector(".sound-button").getAttribute("aria-pressed")==="false"', 'settings survive reload')
    request('POST', f'/session/{session}/window/rect', {'width': 320, 'height': 660})
    js('document.getElementById("app").style.width="320px"; window.dispatchEvent(new Event("resize"))')
    time.sleep(.2)
    check('document.getElementById("start").getBoundingClientRect().bottom < innerHeight', 'small screen start is reachable')
    shot('small')
    js('document.getElementById("help-open").click()')
    js('document.getElementById("help-close").scrollIntoView({block:"end"})')
    check('document.getElementById("help-close").getBoundingClientRect().bottom <= innerHeight && document.getElementById("help-close").getBoundingClientRect().top >= 0', 'short-screen help close button is reachable')
    shot('small-help')
    print(f'Browser flow verified. Artifacts: {artifacts}', flush=True)
finally:
    if session:
        try: request('DELETE', f'/session/{session}')
        except Exception: pass
    driver.terminate()
    try: driver.wait(timeout=5)
    except subprocess.TimeoutExpired: driver.kill()
    server.shutdown()
    server.server_close()
    log.close()
