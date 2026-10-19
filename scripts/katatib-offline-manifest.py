#!/usr/bin/env python3
"""Pin the complete offline shell. Run after changing files in public/katatib."""
import sys
import hashlib
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1] / 'public/katatib'
paths = [root/'index.html',root/'styles.css',root/'favicon.svg',root/'manifest.webmanifest',root/'mushaf/manifest.json', *sorted((root/'live').glob('*.mjs')), root/'live/live.css',root/'live/mushaf.css']
manifest = {'schemaVersion': 1, 'assets': [{'path': '/' if p.name=='index.html' else '/'+str(p.relative_to(root)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]}
content=json.dumps(manifest,indent=2)+'\n'
if '--check' in sys.argv:
    if (root/'offline-shell.json').read_text()!=content:
        raise SystemExit('Offline shell is stale. Run python3 scripts/katatib-offline-manifest.py')
else:
    (root/'offline-shell.json').write_text(content)
