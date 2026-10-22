# Passage descriptions — Warsh

Quranic opening words and complete opening ayahs are taken verbatim from the King Fahd Glorious Quran Printing Complex Warsh text, mirrored in quran-center/quran-meta at commit 3b7afc7f8c905da3d8fb3e8725f86805bd76b2bd:
https://github.com/quran-center/quran-meta/blob/3b7afc7f8c905da3d8fb3e8725f86805bd76b2bd/examples/data-check/data/warshData_v2-1.json

Eighth boundaries are adapted from the Maghreb Warsh / Muhammadi dataset by Noureddine El-Ahmadi, CC BY 4.0, mirrored in smartmaker-devs/nuralhifz-data at commit 365910bc8bf6309765156f221c52d1f6c5813cc0:
https://github.com/smartmaker-devs/nuralhifz-data/blob/365910bc8bf6309765156f221c52d1f6c5813cc0/data/eighths.json
Original project attribution: https://github.com/ELAHMADI/ma-mushaf-muhammadi-data
License: /mushaf/passage-boundaries-license.txt

Changes: each numbered start was cross-checked against the KFQC Warsh text. For non-surah starts, the supplied opening preview must match exactly after Arabic-script normalization used for comparison only. Starts at a surah boundary use that surah's first numbered KFQC ayah, without treating the basmalah as a numbered ayah. Display text itself is not normalized. Only division markers and the font-specific verse-number ornament are omitted; opening excerpts end at complete words. Interior-ayah starts retain the matching character offset and offer the complete opening ayah separately.

The source's 638-page Muhammadi page numbers are not displayed as reader page numbers. All links are mapped from the checked Warsh surah/ayah into Katatib's existing 604-page King Fahd artwork edition. No Hafs numbering or guessed quantity-to-eighth mapping is substituted.

The older quarter-derived navigation index contained shifted hizb starts. The reader's hizb navigation now follows the checked first eighth for each hizb. Artwork, verse numbering, student records and saved marks are unchanged.

Artwork edition: warsh-kfqc-1442, Quran.ws commit b4155f07e4aea087d2c458069acff9f7c7e749f6. See /mushaf/source-notice.md and /mushaf/meta-license.txt for existing terms. Automated reference checks do not replace review by a qualified Warsh teacher.
