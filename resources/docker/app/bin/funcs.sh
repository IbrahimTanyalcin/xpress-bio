#!/bin/bash

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