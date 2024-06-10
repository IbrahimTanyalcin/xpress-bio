#!/bin/bash

set -e -x -o pipefail

BLAST_ARCH="${1:-x64-linux.tar.gz}"
BLAST_VERSION="${2:-2.15.0}"
TARGET_DIR="${3:-/home/IPV/.local/bin}"

mkdir -p $TARGET_DIR
cd $TARGET_DIR
curl -fsSLO https://ftp.ncbi.nlm.nih.gov/blast/executables/blast+/$BLAST_VERSION/ncbi-blast-$BLAST_VERSION+-$BLAST_ARCH
tar -xvzf ncbi-blast-$BLAST_VERSION+-$BLAST_ARCH

for tool in ncbi-blast; do
    chown -R root:IPV $TARGET_DIR/$tool-$BLAST_VERSION+
    chmod -R 775 $TARGET_DIR/$tool-$BLAST_VERSION+
    find $TARGET_DIR/$tool-$BLAST_VERSION+ -type f -print0 | xargs -0 chmod 774
done
