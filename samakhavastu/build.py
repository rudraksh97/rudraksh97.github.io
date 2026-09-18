#!/usr/bin/env python3
"""
Assemble index.html from src/shell.html + partials/*.html.

The shell carries `<!--PARTIAL:name.html-->` markers. Each is replaced by the
contents of partials/<name>. A missing partial is a hard failure: a silently
half-built page is worse than no page.
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent.resolve()
SHELL = ROOT / "src" / "shell.html"
PARTIALS = ROOT / "partials"
OUT = ROOT / "index.html"

MARKER = re.compile(r"[ \t]*<!--PARTIAL:([A-Za-z0-9._-]+)-->")

# Local stylesheet/script references, so they can be content-fingerprinted.
ASSET_REF = re.compile(r'(?P<attr>href|src)="(?P<path>assets/(?:css|js)/[A-Za-z0-9._/-]+\.(?:css|js))"')


def fingerprint(html: str, root: pathlib.Path) -> str:
    """Append ?v=<content hash> to local css/js refs.

    Without this a browser keeps serving a cached stylesheet or script after a
    deploy while the HTML updates, which silently ships a half-old page. The
    hash changes only when the file's bytes change, so caches stay warm
    between deploys that do not touch the asset.
    """

    def stamp(match: "re.Match") -> str:
        rel = match.group("path")
        target = root / rel
        if not target.is_file():
            print(f"FATAL: referenced asset not found: {rel}", file=sys.stderr)
            raise SystemExit(1)
        digest = hashlib.sha256(target.read_bytes()).hexdigest()[:10]
        return f'{match.group("attr")}="{rel}?v={digest}"'

    return ASSET_REF.sub(stamp, html)


def main() -> int:
    if not SHELL.is_file():
        print(f"FATAL: shell not found: {SHELL}", file=sys.stderr)
        return 1

    html = SHELL.read_text(encoding="utf-8")
    used: list[str] = []
    missing: list[str] = []

    def inject(match: re.Match) -> str:
        name = match.group(1)
        path = PARTIALS / name
        if not path.is_file():
            missing.append(name)
            return match.group(0)
        used.append(name)
        return path.read_text(encoding="utf-8").rstrip() + "\n"

    html = MARKER.sub(inject, html)

    if missing:
        for name in missing:
            print(f"FATAL: missing partial: partials/{name}", file=sys.stderr)
        return 1

    html = fingerprint(html, ROOT)

    OUT.write_text(html, encoding="utf-8")
    print(f"built {OUT.relative_to(ROOT)}  ({len(html):,} bytes)")
    for name in used:
        print(f"  + {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
