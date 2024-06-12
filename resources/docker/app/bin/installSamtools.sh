#!/bin/bash

set -e -x -o pipefail

SAMTOOLS_VERSION="${1:-1.18}"
TARGET_DIR="${2:-/home/IPV/.local/bin}"

apt-get -y install libcurl4-openssl-dev
mkdir -p $TARGET_DIR
cd $TARGET_DIR
curl -fsSLO https://github.com/samtools/samtools/releases/download/$SAMTOOLS_VERSION/samtools-$SAMTOOLS_VERSION.tar.bz2
curl -fsSLO https://github.com/samtools/bcftools/releases/download/$SAMTOOLS_VERSION/bcftools-$SAMTOOLS_VERSION.tar.bz2
curl -fsSLO https://github.com/samtools/htslib/releases/download/$SAMTOOLS_VERSION/htslib-$SAMTOOLS_VERSION.tar.bz2
tar -xvjf htslib-$SAMTOOLS_VERSION.tar.bz2
tar -xvjf samtools-$SAMTOOLS_VERSION.tar.bz2
tar -xvjf bcftools-$SAMTOOLS_VERSION.tar.bz2
rm htslib-$SAMTOOLS_VERSION.tar.bz2 samtools-$SAMTOOLS_VERSION.tar.bz2 bcftools-$SAMTOOLS_VERSION.tar.bz2
pushd bcftools-$SAMTOOLS_VERSION && make && popd
pushd htslib-$SAMTOOLS_VERSION && make && popd
pushd samtools-$SAMTOOLS_VERSION && make && popd

for tool in bcftools htslib samtools; do
    chown -R root:IPV $TARGET_DIR/$tool-$SAMTOOLS_VERSION
    chmod -R 775 $TARGET_DIR/$tool-$SAMTOOLS_VERSION
    find $TARGET_DIR/$tool-$SAMTOOLS_VERSION -type f -print0 | xargs -0 chmod 774
done
