# -*- coding: utf-8 -*-
"""对比两份 DOM 轮廓 JSON → 逐行差异。

用法: python scripts/recon_domdiff.py <a.json> <b.json> [out.txt]
"""
import json, sys


def flat(doc, pre=""):
    out = []
    if not doc:
        return out
    def w(n, path):
        label = n.get("al") or n.get("txt") or ""
        key = f"{n.get('d')}|{n.get('t')}|{n.get('c')}|{label[:40]}"
        out.append((path, key, n.get("r"), n.get("disp"), n.get("pad"), n.get("mar"),
                    n.get("gap"), n.get("minh"), n.get("h"), n.get("fs"), n.get("fw")))
        for i, c in enumerate(n.get("k") or []):
            w(c, path + "/" + str(i))
    w(doc, pre)
    return out


def main():
    a = json.load(open(sys.argv[1], encoding="utf-8"))
    b = json.load(open(sys.argv[2], encoding="utf-8"))
    out = sys.argv[3] if len(sys.argv) > 3 else None
    A, B = flat(a), flat(b)
    import difflib
    sa = [f"{p} {k} r={r} disp={d} pad={pd} mar={m} gap={g} minh={mn} h={h} fs={fs} fw={fw}"
          for p, k, r, d, pd, m, g, mn, h, fs, fw in A]
    sb = [f"{p} {k} r={r} disp={d} pad={pd} mar={m} gap={g} minh={mn} h={h} fs={fs} fw={fw}"
          for p, k, r, d, pd, m, g, mn, h, fs, fw in B]
    sm = difflib.SequenceMatcher(None, sa, sb)
    lines = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        lines.append(f"--- {tag} ---")
        for x in sa[i1:i2]:
            lines.append("  O: " + x)
        for x in sb[j1:j2]:
            lines.append("  U: " + x)
    txt = "\n".join(lines)
    if out:
        open(out, "w", encoding="utf-8").write(txt)
    print(txt)


if __name__ == "__main__":
    main()
