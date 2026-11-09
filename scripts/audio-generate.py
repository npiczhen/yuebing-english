"""Build prerecorded English locally; delegate natural Mandarin to its builder.

Install build dependencies under .audio-tools/lib and run audio-download-models.py
first. English is synthesized locally. Chinese course text goes to Microsoft
only during production. Runtime browsers need no model or online TTS.
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import sys
import time
import tempfile
import subprocess

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.audio-tools/lib'))
os.environ['ORT_DISABLE_TELEMETRY'] = '1'
LOCAL_TEMP = ROOT / '.audio-tools/tmp'
LOCAL_TEMP.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(LOCAL_TEMP)
import numpy as np
import soundfile as sf
import lameenc
import onnxruntime as ort
from kokoro_onnx import Kokoro
from misaki.zh import ZHG2P

MODELS = ROOT / '.audio-tools/models'
OUTPUT = ROOT / 'dist/assets/audio'
REPORT = ROOT / 'dist/audio-report.json'
REQUESTS = ROOT / 'scripts/audio-requests.json'
MODEL = MODELS / 'kokoro-v1.1-zh.fp16.onnx'
VOICES = MODELS / 'voices-v1.1-zh.bin'
SOURCES = [
    'https://github.com/hexgrad/kokoro',
    'https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh',
    'https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1',
    'https://github.com/hexgrad/misaki',
    'https://github.com/cmusphinx/cmudict',
]

# This deliberately constrained course has a closed English vocabulary. Use the
# model author's curated US lexicon directly, avoiding OS-dependent fallback
# phonemizers and making every pronunciation auditable before synthesis.
LEXICON_DIR = ROOT / '.audio-tools/lib/misaki/data'
US_GOLD = json.loads((LEXICON_DIR/'us_gold.json').read_text(encoding='utf8'))
US_SILVER = json.loads((LEXICON_DIR/'us_silver.json').read_text(encoding='utf8'))
LETTERS = {'a':'ˈA','b':'bˈi','c':'sˈi','d':'dˈi','e':'ˈi',
           'f':'ˈɛf','g':'ʤˈi','h':'ˈAʧ','i':'ˈI','j':'ʤˈA',
           'k':'kˈA','l':'ˈɛl','m':'ˈɛm','n':'ˈɛn','o':'ˈO',
           'p':'pˈi','q':'kjˈu','r':'ˈɑɹ','s':'ˈɛs','t':'tˈi',
           'u':'jˈu','v':'vˈi','w':'dˈʌbᵊlju','x':'ˈɛks',
           'y':'wˈI','z':'zˈi'}

def english_phonemes(text):
    tokens = re.findall(r"[A-Za-z]+(?:['’][A-Za-z]+)?|[.,!?;:]",text)
    if len(tokens) <= 2 and tokens[0].lower() in LETTERS and len(tokens[0]) == 1:
        return LETTERS[tokens[0].lower()] + (tokens[-1] if tokens[-1] in '.,!?;:' else '.')
    out = []
    for i, token in enumerate(tokens):
        word = token.lower().replace('’',"'")
        if word in '.,!?;:':
            out.append(word)
            continue
        if word in ('a','an'):
            phonemes = 'ə' if word == 'a' else 'ən'
        elif word == 'the':
            nxt = tokens[i+1].lower() if i+1 < len(tokens) else ''
            phonemes = 'ði' if nxt[:1] in 'aeiou' else 'ðə'
        elif word == 'oranges':
            phonemes = 'ˈɔɹᵊnʤᵻz'
        elif word == "i'm":
            # The author's lexicon stores this first-person contraction with
            # a capital I. Keep its curated pronunciation instead of treating
            # the lowercased lookup as an unknown word.
            phonemes = US_GOLD["I'm"]
        else:
            phonemes = US_GOLD.get(word) or US_SILVER.get(word)
            if isinstance(phonemes,dict):
                phonemes = phonemes['DEFAULT']
        assert phonemes, f'Word not in curated US lexicon: {word}'
        out.append(phonemes)
    return ' '.join(out)

def decode_metrics(path):
    audio, rate = sf.read(path, dtype='float32')
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    assert rate == 24000 and len(audio) > 2400, f'Invalid MP3 {path.name}'
    assert np.isfinite(audio).all(), f'Nonfinite samples: {path.name}'
    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio**2)))
    assert .02 < peak < 1.0 and rms > .004, f'Silent or clipped: {path.name}'
    return {'bytes': path.stat().st_size, 'sampleRate': rate,
            'durationSeconds': round(len(audio)/rate, 3),
            'peak': round(peak, 5), 'rms': round(rms, 5),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'decodeCheck': 'passed'}

def encode(audio, path, rate=24000):
    assert np.isfinite(audio).all() and len(audio) > rate*.1
    peak = np.max(np.abs(audio))
    assert peak > .005, 'Silent model output'
    # Remove only long model-generated silence; keep quiet consonants / final stops.
    active = np.flatnonzero(np.abs(audio) > .0003)
    assert len(active) > 100, 'No audible speech'
    start = max(0, int(active[0])-int(rate*.08))
    end = min(len(audio), int(active[-1])+int(rate*.16))
    audio = audio[start:end]
    # Keep model speech boundaries and add protective pads.
    # Peak normalize gently so children's vocabulary cards have consistent volume.
    audio = audio * min(.84/peak, 2.5)
    audio = np.concatenate([np.zeros(int(rate*.10),np.float32), audio,
                            np.zeros(int(rate*.20),np.float32)])
    pcm = (np.clip(audio, -.95, .95)*32767).astype('<i2').tobytes()
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(96)
    encoder.set_in_sample_rate(rate)
    encoder.set_channels(1)
    encoder.set_quality(2)
    data = encoder.encode(pcm) + encoder.flush()
    temp = path.with_suffix('.part')
    temp.write_bytes(data)
    temp.replace(path)
    return decode_metrics(path)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--lang', choices=['en','zh'])
    args = parser.parse_args()
    if args.lang == 'zh':
        command = [sys.executable, str(ROOT/'scripts/audio-chinese-generate.py')]
        if args.force:
            command.append('--force')
        if args.verify_only:
            command.append('--verify-only')
        if args.limit:
            command.extend(['--limit',str(args.limit)])
        subprocess.run(command,check=True)
        return
    if args.lang is None:
        if not args.verify_only:
            for lang in ['en','zh']:
                command = [sys.executable, str(Path(__file__).resolve()), '--lang', lang]
                if args.force:
                    command.append('--force')
                if args.limit:
                    command.extend(['--limit', str(args.limit)])
                subprocess.run(command, check=True)
        subprocess.run([sys.executable,str(ROOT/'scripts/audio-finalize.py')],check=True)
        return
    requests = json.loads(REQUESTS.read_text(encoding='utf8'))
    assert len({r['id'] for r in requests}) == len(requests), 'Duplicate audio ids'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    previous = {}
    for report_file in [REPORT,ROOT/'.audio-tools/report-en.json',ROOT/'.audio-tools/report-zh.json']:
        if report_file.exists():
            previous.update({x['id']:x for x in json.loads(report_file.read_text(encoding='utf8')).get('files',[])})
    report_path = ROOT/('.audio-tools/report-'+args.lang+'.json') if args.lang else REPORT
    entries = [v for k,v in previous.items() if (OUTPUT/(k+'.mp3')).exists()
               and v.get('lang')==args.lang
               and any(r['id']==k and r['text']==v['text'] for r in requests)]
    failures = []
    started = time.time()
    tts = None
    if not args.verify_only:
        opts = ort.SessionOptions()
        opts.log_severity_level = 3
        opts.intra_op_num_threads = 4
        opts.inter_op_num_threads = 1
        model_path = MODELS/'kokoro-v1.0.fp16.onnx' if args.lang == 'en' else MODEL
        voices_path = MODELS/'voices-v1.0.bin' if args.lang == 'en' else VOICES
        session = ort.InferenceSession(str(model_path), sess_options=opts, providers=['CPUExecutionProvider'])
        tts = Kokoro.from_session(session, str(voices_path))
        print('Loaded model:',model_path.name,'with',len(tts.voices.files),'voices',flush=True)
        english_voice = 'af_heart'
        zh_voice = next((n for n in ['zf_xiaoxiao','zf_001','zf_xiaobei','zf_017'] if n in tts.voices),None)
        assert (args.lang != 'en' or english_voice in tts.voices) and (args.lang != 'zh' or zh_voice), 'Required voices not found'
        zh_g2p = ZHG2P(version='1.1', en_callable=english_phonemes)
        # Treat the child's nickname as a name, retaining the full third tone
        # in bǐng instead of the frontend's optional food-word neutral tone.
        if zh_g2p.frontend is not None:
            from pypinyin import load_phrases_dict
            load_phrases_dict({'月饼':[['yue4'],['bing3']]})
            zh_g2p.frontend.tone_modifier.must_neural_tone_words.discard('月饼')
            zh_g2p.frontend.tone_modifier.must_not_neural_tone_words.add('月饼')
        print('Voices:', english_voice, zh_voice, flush=True)
    selected = [r for r in requests if args.lang is None or r['lang']==args.lang]
    for i, item in enumerate(selected[:args.limit or len(selected)]):
        entry = dict(item)
        path = OUTPUT / (item['id']+'.mp3')
        try:
            cached = previous.get(item['id'], {})
            if path.exists() and not args.force and (args.verify_only or cached.get('text') == item['text']):
                entry.update(cached)
                entry.update(decode_metrics(path))
                entry.setdefault('voice','af_heart' if item['lang']=='en' else 'zf_001')
                entry.setdefault('speed',.87 if item['lang']=='en' else .95)
                entry.setdefault('engine',f'Kokoro {"v1.0" if item["lang"]=="en" else "v1.1-zh"} FP16 / kokoro-onnx 0.6.1')
            else:
                if args.verify_only:
                    raise FileNotFoundError(path.name)
                text = item['text'].replace('’', "'")
                if item['lang'] == 'en':
                    text = text[0].upper()+text[1:]
                    if text[-1] not in '.!?':
                        text += '.'
                    phonemes = english_phonemes(text)
                    voice, speed = english_voice, .87
                else:
                    phonemes, _ = zh_g2p(text)
                    voice, speed = zh_voice, .95
                assert phonemes.strip() and '❓' not in phonemes, f'Unknown phonemes {phonemes!r}'
                unknown = set(phonemes) - set(tts.tokenizer.vocab)
                assert not unknown, f'Out-of-model phonemes {unknown!r}'
                audio, rate = tts.create(phonemes, voice=voice, speed=speed,
                                         is_phonemes=True, trim=False,
                                         sentence_pause=.3,clause_pause=.15)
                entry.update({'voice':voice,'speed':speed,'phonemes':phonemes,
                              'engine':f'Kokoro {"v1.0" if item["lang"]=="en" else "v1.1-zh"} FP16 / kokoro-onnx 0.6.1'})
                entry.update(encode(audio,path,rate))
            entries = [e for e in entries if e['id'] != item['id']]
            entries.append(entry)
            print(f'[{i+1}/{len(selected)}] {item["id"]} {entry["durationSeconds"]}s',flush=True)
        except Exception as exc:
            failures.append({'id':item['id'],'error':str(exc)})
            print('FAILED',item['id'],repr(exc),flush=True)
    report = {'version':json.loads((ROOT/'dist/curriculum.json').read_text(encoding='utf8'))['version'],'generatedLocally':True,'networkUsedForSynthesis':False,
              'sources':SOURCES,
              'models':[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
                        for p in [MODELS/'kokoro-v1.0.fp16.onnx',MODEL] if p.exists()],
              'licenses':{'model':'Apache-2.0','kokoro-onnx':'MIT','misaki':'Apache-2.0',
                          'modelLicenseFile':'assets/audio/LICENSE-model.txt'},
              'pronunciationOverrides':{'月饼':'yue4 bing3 (nickname, full tone)'},
              'requested':len(requests),'completed':len(entries),'failed':failures,
              'totalBytes':sum(x['bytes'] for x in entries),
              'totalDurationSeconds':round(sum(x['durationSeconds'] for x in entries),2),
              'elapsedSeconds':round(time.time()-started,1),
              'qualityChecks':['Every MP3 decoded with libsndfile',
                               '24 kHz mono, finite samples, non-silent amplitude, no clipping',
                               'Full phoneme coverage verified against embedded model vocabulary',
                               'English uses the model author curated US pronunciation lexicon',
                               'Quiet consonants retained with boundary margins and 100 ms / 200 ms protective silence'],
              'humanListeningReview':{'completed':False,'limitation':
                  'Automated waveform and phoneme checks cannot certify pronunciation or naturalness. '
                  'A fluent US English and Mandarin speaker should listen to all clips before claiming expert review.'},
              'files':entries}
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['files','sources']},ensure_ascii=False),flush=True)
    if tts is not None:
        tts.voices.close()
    if failures:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
