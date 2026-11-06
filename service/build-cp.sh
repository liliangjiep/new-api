#!/usr/bin/env bash
# 生成运行 classpath —— mvn dependency:build-classpath 输出到 run-cp.txt
cd "$(dirname "$0")"
mvn -q -pl api -am dependency:build-classpath -Dmdep.outputFile="$(pwd)/run-cp.txt" -Dmdep.includeScope=runtime 2>&1 | tail -5
echo "run-cp.txt written: $(wc -c < run-cp.txt) bytes"
