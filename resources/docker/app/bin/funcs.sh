#!/bin/bash

#ANSI control constructs
logRED='\033[0;31m'
logGREEN='\033[0;32m' 
logBLUE='\033[0;34m'
logCYAN='\033[0;36m' 
logNEUT='\033[0m'
logBLACK='\033[0;30m'
logYELLOW='\033[0;33m'
logYELLOWBG='\033[43m'
clearLINE='\033[K'

xpressbio_has() {
    type "$1" > /dev/null 2>&1
}

get_executable_path() {
    for i in "$@"; do 
        if xpressbio_has "$i"
        then
            echo -n "$i";
            return 0;
        fi
    done;
    return 1;
}

issueInfo() {
    local dCarets uCarets formatString modifiedArgs
    dCarets=$(printf "%.0s˅" {1..36})
    uCarets=$(printf "%.0s˄" {1..36})
    for _ in "${@}"; do
        formatString+="%s\n"
    done
    modifiedArgs=("${@}")
    modifiedArgs=("${modifiedArgs[@]/#/>    }")
    printf "${logCYAN}${dCarets}::INFO::${dCarets}\n"
    printf "${formatString}" "${modifiedArgs[@]}"
    printf "${uCarets}::::::::${uCarets}${logNEUT}\n"
}

installCerts() {
    local certs_dir="/app/certs"
    local ca_cert_dir="/usr/local/share/ca-certificates"
    if [[ -d "$certs_dir" && $(find "$certs_dir" -name "*.crt" -o -name "*.pem" -type f | wc -l) -gt 0 ]]; then
        issueInfo "Certificates found in $certs_dir."
        #in case ca-certificates folder do not exist.
        if [[ ! -d "$ca_cert_dir" ]]; then
            mkdir -p "$ca_cert_dir"
        fi
        cp "$certs_dir"/*.crt "$certs_dir"/*.pem "$ca_cert_dir"
        if ! xpressbio_has update-ca-certificates; then
            issueInfo "update-ca-certificates not found, installing via apt-get..."
            apt-get update && apt-get install -y ca-certificates
        fi
        issueInfo "Installing certs..."
        update-ca-certificates
        if [[ " $* " == *[[:space:]]?(-)-rm[[:space:]]* ]]; then
            rm -rf "$certs_dir"
        fi
    fi
}