"""Verify every current clip and write an honest mixed-source production report."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.audio-tools/lib'))
import numpy as np
import soundfile as sf

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prune',action='store_true',help='Remove obsolete generated MP3 files only after all checks pass')
    args=parser.parse_args()
    requests=json.loads((ROOT/'scripts/audio-requests.json').read_text(encoding='utf8'))
    curriculum=json.loads((ROOT/'dist/curriculum.json').read_text(encoding='utf8'))
    english=json.loads((ROOT/'.audio-tools/report-en.json').read_text(encoding='utf8'))
    chinese=json.loads((ROOT/'dist/chinese-audio-report.json').read_text(encoding='utf8'))
    assert not english['failed'] and not chinese['failed'], 'Resolve generation failures first'
    assert chinese['voice']=='zh-CN-XiaoxiaoNeural'
    by_id={entry['id']:entry for entry in english['files'] if entry['lang']=='en'}
    by_id.update({entry['id']:entry for entry in chinese['files'] if entry['lang']=='zh'})
    entries=[]
    output=(ROOT/'dist/assets/audio').resolve()
    for item in requests:
        entry=dict(by_id[item['id']])
        assert entry['text']==item['text'] and entry['lang']==item['lang'], item['id']
        path=output/(item['id']+'.mp3')
        audio,rate=sf.read(path,dtype='float32')
        assert rate==24000 and audio.ndim==1 and len(audio)>2400 and np.isfinite(audio).all(), item['id']
        peak=float(np.max(np.abs(audio))); rms=float(np.sqrt(np.mean(audio**2)))
        assert .02<peak<1 and rms>.004, item['id']
        assert path.stat().st_size==entry['bytes']
        assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256'], item['id']
        if item['lang']=='zh':
            assert entry['voice']==chinese['voice'] and entry['sourceTextCheck']=='complete sentence metadata'
        else:
            assert entry['voice']=='af_heart' and entry.get('phonemes'), item['id']
        entry['networkUsedForSynthesis']=item['lang']=='zh'
        entries.append(entry)
    report={
        'version':curriculum['version'],'generatedLocally':False,'networkUsedForSynthesis':True,
        'runtimeNetworkRequired':False,'childRecordingsUploaded':False,
        'generation':{
            'english':{'engine':'Kokoro v1.0 FP16 / kokoro-onnx 0.6.1','voice':'af_heart','speed':.87,'generatedLocally':True},
            'chinese':{'engine':chinese['engine'],'voice':chinese['voice'],'rate':chinese['rate'],'generatedLocally':False,
                       'synthesisInput':'Prerecorded course script text only, including the nickname 月饼.','isHumanRecording':False}},
        'sources':list(dict.fromkeys(english['sources']+chinese['sources'])),
        'models':[m for m in english['models'] if m['file']=='kokoro-v1.0.fp16.onnx'],
        'licenses':{'english':english['licenses'],'chinese':chinese['licenses']},
        'requested':len(requests),'completed':len(entries),'failed':[],
        'totalBytes':sum(e['bytes'] for e in entries),'totalDurationSeconds':round(sum(e['durationSeconds'] for e in entries),3),
        'qualityChecks':['Every current MP3 decoded: 24 kHz mono, finite, non-silent, no clipping.',
                         'Each file matches the exact requested text, language, stored byte count and SHA-256.',
                         'English uses the model author curated US lexicon and checked model phonemes.',
                         'Mandarin returned sentence metadata covers the complete requested script.'],
        'humanListeningReview':{'completed':False,'limitation':'Automatic checks do not certify every pronunciation or naturalness. No human listening certification is claimed.'},
        'files':entries}
    (ROOT/'dist/audio-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    removed=0
    if args.prune:
        active={item['id']+'.mp3' for item in requests}
        for path in output.glob('*.mp3'):
            if re.fullmatch(r'(en|zh)-[a-f0-9]{12}\.mp3',path.name) and path.name not in active:
                assert path.resolve().parent==output
                path.unlink();removed+=1
    print(f'PASS {len(entries)} verified clips; English local, Mandarin pre-rendered online; removed {removed} obsolete generated clips.')

if __name__=='__main__':
    main()
