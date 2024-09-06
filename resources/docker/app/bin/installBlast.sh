#!/bin/bash

set -e -x -o pipefail

BLAST_ARCH="${1:-x64-linux}"
BLAST_VERSION="${2:-2.15.0}"
TARGET_DIR="${3:-/home/IPV/.local/bin}"
BLAST_DOWNLOAD_URL="https://ftp.ncbi.nlm.nih.gov/blast/executables/blast+"
BLAST_TARBALL="ncbi-blast-${BLAST_VERSION}+-${BLAST_ARCH}.tar.gz"

mkdir -p $TARGET_DIR
cd $TARGET_DIR
curl -fsSLO "${BLAST_DOWNLOAD_URL}/${BLAST_VERSION}/${BLAST_TARBALL}"
tar -xvzf "${BLAST_TARBALL}"
rm "${BLAST_TARBALL}"

for tool in ncbi-blast; do
    chown -R root:IPV $TARGET_DIR/$tool-$BLAST_VERSION+
    find $TARGET_DIR/$tool-$BLAST_VERSION+ -type d -print0 | xargs -0 chmod 755
    find $TARGET_DIR/$tool-$BLAST_VERSION+/bin -type f -print0 | xargs -0 chmod 774
done
