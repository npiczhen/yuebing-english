"""Download public Kokoro build-time models. No course text is sent anywhere."""
from pathlib import Path
import concurrent.futures
import hashlib
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / '.audio-tools' / 'models'
BASE = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/'

def run(args):
    return subprocess.run(['curl.exe', '--fail', '--silent', '--show-error',
                           '--location', '--connect-timeout', '25', '--max-time', '300',
                           *args], check=True, capture_output=True)

def download(name):
    MODELS.mkdir(parents=True, exist_ok=True)
    url = BASE + name
    header = run(['--head', url]).stdout.decode('utf8', 'replace')
    sizes = re.findall(r'(?im)^content-length:\s*(\d+)', header)
    total = int(sizes[-1])
    target = MODELS / name
    if target.exists() and target.stat().st_size == total:
        print('Already downloaded', name, total, flush=True)
        return
    parts = MODELS / (name + '.parts')
    parts.mkdir(exist_ok=True)
    chunk = 4 * 1024 * 1024
    def get_part(i):
        start, end = i * chunk, min((i+1)*chunk, total)-1
        path = parts / str(i)
        for attempt in range(3):
            if path.exists() and path.stat().st_size == end-start+1:
                return path
            try:
                run(['--range', f'{start}-{end}', '--output', str(path), url])
                if path.stat().st_size != end-start+1:
                    raise ValueError(f'Range not honored: {path.stat().st_size}')
                print(name, 'part', i+1, '/', (total+chunk-1)//chunk, flush=True)
                return path
            except Exception:
                if attempt == 2:
                    raise
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        files = list(pool.map(get_part, range((total+chunk-1)//chunk)))
    temp = target.with_suffix(target.suffix+'.download')
    with temp.open('wb') as out:
        for part in files:
            out.write(part.read_bytes())
    assert temp.stat().st_size == total
    temp.replace(target)
    print('Complete', name, total, hashlib.sha256(target.read_bytes()).hexdigest(), flush=True)

if __name__ == '__main__':
    for name in sys.argv[1:] or ['kokoro-v1.1-zh.fp16.onnx', 'voices-v1.1-zh.bin']:
        download(name)
