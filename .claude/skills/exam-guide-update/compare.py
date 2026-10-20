#!/usr/bin/env python3
"""Compare two editions of the CCA Foundations exam guide PDF.

Usage: python3 compare.py OLD.pdf NEW.pdf

Prints a Markdown report: edition (version + last-updated date), the exam-details
table, domains and weights, scenarios, task statements, and a sentence-level diff
of everything else. Page headers/footers and line wrapping are normalized away, so
only real wording changes show up. Needs `pdftotext` (poppler).
"""
from __future__ import annotations

import difflib
import hashlib
import re
import subprocess
import sys

# Running page header/footer text in either edition; stripped before comparing.
FOOTERS = [
    r"Anthropic, PBC · Confidential Need to Know \(NTK\)",
    r"Claude Certification Program\s+Exam guide",
]


def pdf_text(path: str, layout: bool = False) -> str:
    args = ["pdftotext"] + (["-layout"] if layout else []) + [path, "-"]
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def flat(text: str) -> str:
    """One line of text with footers, bullets, page numbers and hyphen wraps removed."""
    for f in FOOTERS:
        text = re.sub(f, " ", text)
    # Bullet markers: "•" in newer editions, "-" + zero-width space in older ones.
    # Matched exactly so a real leading dash (e.g. "--output-format") survives.
    text = text.replace("-​", " ").replace("•", " ").replace("​", "")
    text = re.sub(r"(?m)^\s*\d+\s*$", " ", text)  # bare page numbers
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1-\2", text)  # "multi-\nagent"
    text = re.sub(r"\s+", " ", text)
    # Spacing around em dashes differs between editions; it isn't a wording change.
    return re.sub(r"\s*—\s*", "—", text).strip()


def edition(text: str) -> str:
    m = re.search(r"Version\s+(\S+)\s+Last Updated:\s*([A-Za-z]+ \d+,? \d{4})", text)
    return f"version {m.group(1)}, last updated {m.group(2)}" if m else "(edition not found)"


def details(layout_text: str) -> dict[str, str]:
    """The 'Exam Details at a Glance' table as {label: value}, if the edition has one."""
    m = re.search(r"Exam Details at a Glance(.*?)Target Candidate", layout_text, re.S)
    if not m:
        return {}
    rows = {}
    for line in m.group(1).splitlines():
        parts = re.split(r"\s{2,}", line.strip(), maxsplit=1)
        if len(parts) == 2:
            rows[parts[0]] = parts[1]
    return rows


def domains(text: str) -> dict[str, str]:
    return {
        n: f"{title.strip()} ({pct}%)"
        for n, title, pct in re.findall(
            r"Domain (\d): ([^()]+?) \((\d+)% of scored content\)", text
        )
    }


def scenarios(text: str) -> dict[str, str]:
    return dict(re.findall(r"Scenario (\d+): (.+?)(?= [A-Z][a-z]+ [a-z]| Scenario \d|$)", text))


def tasks(text: str) -> dict[str, str]:
    return {
        n: title.strip()
        for n, title in re.findall(r"Task Statement (\d+\.\d+): (.*?) Knowledge of:", text)
    }


def sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.?!:])\s+", text) if len(s) > 3]


def diff_map(title: str, old: dict[str, str], new: dict[str, str]) -> list[str]:
    out = [f"## {title}", ""]
    changed = False
    for key in sorted(set(old) | set(new), key=lambda k: [int(x) for x in re.findall(r"\d+", k)] or [k]):
        a, b = old.get(key), new.get(key)
        if a == b:
            continue
        changed = True
        if a is None:
            out.append(f"- **added** {key}: {b}")
        elif b is None:
            out.append(f"- **removed** {key}: {a}")
        else:
            out.append(f"- **changed** {key}: {a} → {b}")
    if not changed:
        out.append(f"No change ({len(new)} entries).")
    return out + [""]


def main(old_pdf: str, new_pdf: str) -> None:
    def sha(p: str) -> str:
        with open(p, "rb") as fh:
            return hashlib.sha256(fh.read()).hexdigest()

    if sha(old_pdf) == sha(new_pdf):
        print("The two PDFs are byte-identical. Nothing to update.")
        return

    # Layout mode keeps a hyphen at a line break as-is; plain mode silently drops
    # it ("multi-\nsource" -> "multisource"), which would show up as a fake change.
    old_layout, new_layout = pdf_text(old_pdf, True), pdf_text(new_pdf, True)
    old, new = flat(old_layout), flat(new_layout)

    report = [
        "# Exam guide comparison",
        "",
        f"- Old: {edition(old)}",
        f"- New: {edition(new)}",
        "",
    ]
    report += diff_map("Exam details", details(old_layout), details(new_layout))
    report += diff_map("Domains and weights", domains(old), domains(new))
    report += diff_map("Scenarios", scenarios(old), scenarios(new))
    report += diff_map("Task statements", tasks(old), tasks(new))

    report += ["## Other wording changes", ""]
    a, b = sentences(old), sentences(new)
    ops = [op for op in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if op[0] != "equal"]
    if not ops:
        report.append("None.")
    for tag, i1, i2, j1, j2 in ops:
        for s in a[i1:i2]:
            report.append(f"- old: {s}")
        for s in b[j1:j2]:
            report.append(f"+ new: {s}")
        report.append("")
    print("\n".join(report))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: compare.py OLD.pdf NEW.pdf")
    main(sys.argv[1], sys.argv[2])
