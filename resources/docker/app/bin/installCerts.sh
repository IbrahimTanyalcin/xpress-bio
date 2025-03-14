#!/bin/bash

set -e;

shopt -s extglob
progName="${0}"
scriptFolder="$( dirname ${BASH_SOURCE[0]} )"
scriptName="$( basename ${BASH_SOURCE[0]} )"
source "${scriptFolder}/funcs.sh";

installCerts --rm