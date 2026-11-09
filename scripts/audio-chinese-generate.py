"""Pre-render natural Mandarin narration, never synthesize from the child app.

Build time only: course script text is sent to Microsoft's online Edge speech
service by edge-tts. Children's microphone recordings are never an input here.
Only MP3s and the provenance report ship to the offline website.
"""
from pathlib import Path
import argparse
import asyncio
import hashlib
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.audio-tools/lib'))
import edge_tts
import numpy as np
import soundfile as sf

VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-8%'
PITCH = '+0Hz'
ENGINE = 'Microsoft Edge neural speech / edge-tts ' + edge_tts.__version__
OUTPUT = ROOT / 'dist/assets/audio'
REPORT = ROOT / 'dist/chinese-audio-report.json'
REQUESTS = ROOT / 'scripts/audio-requests.json'


def measure(path):
    audio, sample_rate = sf.read(path, dtype='float32')
    assert audio.ndim == 1 and sample_rate == 24000, 'Expected 24 kHz mono MP3'
    assert len(audio) > sample_rate * .2 and np.isfinite(audio).all(), 'Invalid samples'
    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio ** 2)))
    assert .02 < peak < 1.0 and rms > .004, 'Silent or clipped output'
    return {'bytes': path.stat().st_size, 'sampleRate': sample_rate,
            'channels': 1, 'durationSeconds': round(len(audio) / sample_rate, 3),
            'peak': round(peak, 5), 'rms': round(rms, 5),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'decodeCheck': 'passed'}


def normalize(text):
    return ''.join(c.lower() for c in text if c.isalnum())


async def synthesize(item, destination):
    part = destination.with_suffix('.part')
    chunks = []
    boundaries = []
    communicate = edge_tts.Communicate(item['text'], voice=VOICE, rate=RATE,
                                      pitch=PITCH, boundary='SentenceBoundary',
                                      connect_timeout=15, receive_timeout=30)
    async for chunk in communicate.stream():
        if chunk['type'] == 'audio':
            chunks.append(chunk['data'])
        elif chunk['type'] == 'SentenceBoundary':
            boundaries.append(chunk['text'])
    assert chunks, 'No audio returned'
    observed = ''.join(boundaries)
    assert normalize(observed) == normalize(item['text']), (
        'Returned sentence metadata does not cover the complete script')
    part.write_bytes(b''.join(chunks))
    try:
        metrics = measure(part)
        part.replace(destination)
        return {**item, 'engine': ENGINE, 'voice': VOICE, 'rate': RATE,
                'pitch': PITCH, 'sourceTextCheck': 'complete sentence metadata',
                'returnedSentences': boundaries, **metrics}
    finally:
        part.unlink(missing_ok=True)


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--concurrency', type=int, default=3)
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    assert 1 <= args.concurrency <= 4, 'Use between 1 and 4 concurrent requests'
    requests = [r for r in json.loads(REQUESTS.read_text(encoding='utf8')) if r['lang'] == 'zh']
    assert len(requests) == len({r['id'] for r in requests}), 'Duplicate Chinese IDs'
    if args.limit:
        requests = requests[:args.limit]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    previous = {}
    if REPORT.exists():
        previous = {f['id']: f for f in json.loads(REPORT.read_text(encoding='utf8')).get('files', [])}
    files, failures = {}, []
    started = time.time()
    semaphore = asyncio.Semaphore(args.concurrency)

    def checkpoint():
        entries = [files[r['id']] for r in requests if r['id'] in files]
        report = {
            'version': json.loads((ROOT / 'dist/curriculum.json').read_text(encoding='utf8'))['version'],
            'engine': ENGINE, 'voice': VOICE, 'rate': RATE, 'pitch': PITCH,
            'generatedLocally': False, 'networkUsedForSynthesis': True,
            'synthesisInput': 'Prerecorded course script text only, including the nickname 月饼.',
            'childRecordingsUploaded': False, 'runtimeNetworkRequired': False,
            'isHumanRecording': False,
            'sources': [
                'https://github.com/rany2/edge-tts',
                'https://github.com/rany2/edge-tts/blob/master/LICENSE',
                'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support',
                'https://www.microsoft.com/en-us/servicesagreement'],
            'licenses': {
                'buildClient': 'edge-tts LGPL-3.0; package is not redistributed in the website.',
                'service': 'Microsoft service terms apply to online synthesis and its output; the client software license does not license Microsoft voices.'},
            'requested': len(requests), 'completed': len(entries), 'failed': failures,
            'totalBytes': sum(e['bytes'] for e in entries),
            'totalDurationSeconds': round(sum(e['durationSeconds'] for e in entries), 3),
            'elapsedSeconds': round(time.time() - started, 1),
            'qualityChecks': [
                'Every MP3 decoded successfully; 24 kHz mono, finite non-silent samples, no clipping.',
                'Returned sentence metadata covers the complete requested script.',
                'Cache reuse requires identical text, engine, voice, rate, pitch, and SHA-256.'],
            'humanListeningReview': {'completed': False, 'limitation':
                'Waveform and sentence checks do not certify naturalness or every pronunciation.'},
            'files': entries}
        temp = REPORT.with_suffix('.tmp')
        temp.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
        temp.replace(REPORT)

    async def make(index, item):
        async with semaphore:
            path = OUTPUT / (item['id'] + '.mp3')
            cached = previous.get(item['id'], {})
            same_settings = all(cached.get(k) == v for k, v in {
                'text': item['text'], 'engine': ENGINE, 'voice': VOICE,
                'rate': RATE, 'pitch': PITCH}.items())
            try:
                metrics = None
                if path.exists() and same_settings and (args.verify_only or not args.force):
                    try:
                        metrics = measure(path)
                        assert metrics['sha256'] == cached.get('sha256'), 'Cached MP3 digest changed'
                    except Exception:
                        if args.verify_only:
                            raise
                        metrics = None
                if metrics is not None:
                    files[item['id']] = {**cached, **metrics}
                    action = 'verified'
                else:
                    assert not args.verify_only, 'No matching natural-voice recording in cache'
                    for attempt in range(2):
                        try:
                            files[item['id']] = await asyncio.wait_for(synthesize(item, path), timeout=65)
                            break
                        except Exception as exc:
                            # Never retry an authorization rejection with a different endpoint,
                            # headers, token, or identity. Retry only transient network failures.
                            status = getattr(exc, 'status', None)
                            if status in (401, 403) or attempt == 1 or isinstance(exc, AssertionError):
                                raise
                            await asyncio.sleep(1)
                    action = 'created'
                print(f'[{index + 1}/{len(requests)}] {action} {item["id"]} '
                      f'{files[item["id"]]["durationSeconds"]}s', flush=True)
            except Exception as exc:
                failures.append({'id': item['id'], 'error': type(exc).__name__ + ': ' + str(exc)})
                print(f'FAILED {item["id"]}: {type(exc).__name__}: {exc}', flush=True)
            if not args.verify_only:
                checkpoint()

    await asyncio.gather(*(make(i, item) for i, item in enumerate(requests)))
    checkpoint()
    print(json.dumps({'completed': len(files), 'requested': len(requests),
                      'failed': len(failures), 'elapsedSeconds': round(time.time() - started, 1)}), flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    asyncio.run(main())
