#!/bin/bash
#installs dependencies on Debian that does not come like in Ubuntu

#compression algo
apt-get -y install liblz4-tool
#hexdump
apt-get -y install bsdmainutils
#earlier Debian versions had this, but after node:20, it needs to be installed
apt-get -y install liblzma-dev
