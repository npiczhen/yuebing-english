"""Record all current course words beside their CMU US pronunciations."""
from pathlib import Path
import json
import re
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parents[1]
spec = spec_from_file_location('audio_generate', ROOT/'scripts/audio-generate.py')
module = module_from_spec(spec)
spec.loader.exec_module(module)
words = [word['id'] for word in json.loads((ROOT/'dist/curriculum.json').read_text(encoding='utf8'))['vocabulary']]
dictionary = (ROOT/'.audio-tools/cmudict.dict').read_text(encoding='utf8')
rows = []
for word in words:
    variants = re.findall(r'^'+word+r'(?:\(\d+\))? (.+)$', dictionary,re.M)
    assert variants, f'Missing US pronunciation reference for {word}'
    phonemes = module.english_phonemes(word+'.')
    rows.append({'word':word,'cmuArpabet':variants,'kokoroUSPhonemes':phonemes})
out = {'source':'https://github.com/cmusphinx/cmudict',
       'dictionaryLicense':'BSD-2-Clause',
       'checkedWordCount':len(rows),
       'method':'Closed course vocabulary checked against author-curated US lexicon; CMU transcription recorded for comparison. Phonemic references do not replace listening to the generated waveform.',
       'notes':['US vowel mergers and flapping can differ from dictionary notation.',
                'Kokoro uses model-specific single-character diphthongs and affricates.'],
       'words':rows}
(ROOT/'dist/assets/audio/pronunciation-reference.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(f'Recorded {len(rows)} US vocabulary pronunciation references.')
