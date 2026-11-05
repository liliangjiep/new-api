# -*- coding: utf-8 -*-
import re, sys, glob

for f in sorted(glob.glob(".recon/full_orig_*.txt")):
    s = open(f, encoding="utf-8").read()
    lines = s.split("\n")
    fn = sum(1 for l in lines if "workspace-floating-navigation " in l)
    titles = re.findall(r'workspace-navigation-title[^\n]*?"([^"]*)"', s)
    print(f, "floatnav=", fn, "titles=", titles)
