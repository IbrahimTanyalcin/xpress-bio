#!/bin/bash

repTillEx0 () (
    #set -x;
    shopt -s extglob
    local funcName="${FUNCNAME[0]}";
    local helpStr="$(sed 's/^\s*//' <<EOL 
        > ˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅
        > 10-2022 - Ibrahim Tanyalcin - MIT LICENSE
        >
        > Repeats a command every x secs until it is successful or max amount of iterations are reached. 
        >
        > SYNOPSIS:
        >-------------------------------------------------------------------------------------------------------------------------
        > ${funcName} <COMMAND: string> [[<COMMAND: string>],...] <INTERVAL: float|integer> <MAXITER: integer>
        >-------------------------------------------------------------------------------------------------------------------------
        > NOTE: '(-)-quiet', '(-)-q', '(-)-reflect', '(-)-callback', '(-)-help' optional args are accepted anywhere
        >       You need to provide at least 3 arguments.
        >       If you want both ${funcName} and 'COMMAND' to be quiet, then supply '-q' twice.
        >       Exits with 0 if 'COMMAND' successful, 1 if 'maxIter' is reached, 2 if ${funcName} error
        > USAGE: 
        > Check whether memcached is started with default 0.5s interval 3 max iterations
        >     ${funcName} 'pidof' 'memcached' '""' '""'
        > Check whether memcached is started with 2s interval 10 max iterations
        >     ${funcName} 'pidof' 'memcached' '2' '10' 
        > Parse command from string
        >     ${funcName} '/bin/bash' '-c' '[[ \$(( 1 - 1 )) -eq 10 ]]' '2' '10' 
        > Below terminates halfway during iteration (DON'T USE EVAL)
        >     ${funcName} 'eval' "[[ \"\${maxIter}\" -eq 5 ]]" '2' '10' 
        > OPTIONS:
        >    -q, --quiet: Do not output 'COMMAND's stdout.
        >    --reflect: When maxIter is reached, instead of returning 1, return '\$?'
        >    --callback: The next argument should point to a function that will receive 3 arguments: 
        >                \${1}- last exit code, \${2}- current iteration, \${3}- full command string
        >                If current iteration is 0, it means it is the last call to the callback.
        > ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
EOL
    )"

    if [[ "$*" == ?(*[[:space:]])?(-)-help?([[:space:]]*) ]]
    then
        echo "${helpStr}";
        exit 0;
    fi

    local posArgs=();
    local quiet=0;
    local reflect=0;
    local cb="";
    for((i=1; i<="$#"; ++i))
    do
        if [[ (${quiet} -ne 1) && ( ("${!i}" == ?(-)-quiet) || ("${!i}" == ?(-)-q) ) ]]
        then 
            quiet=1;
        elif [[ (${reflect} -ne 1) && ("${!i}" == ?(-)-reflect) ]]
        then 
            reflect=1;
        elif [[ "${!i}" == ?(-)-callback ]]
        then
            ((++i));
            cb="${!i}";
        else
            posArgs+=("${!i}");
        fi
    done

    if [[ "${#posArgs[@]}" -lt 3 ]]
    then
        echo -e "::INCOMPLETE ARGUMENTS::\n${helpStr}" >&2; 
        exit 2;
    fi

    local interval="${posArgs[@]: -2:1}";
          interval=${interval:-0.5};
    local maxIter="${posArgs[@]: -1:1}";
          maxIter="${maxIter:-3}";
    local commArgLen=$((${#posArgs[@]} - 2));
    local isNumber='^[0-9]+(\.[0-9]+)?$';
    local lastExCode=0;
    if ! [[ ("${interval}" =~ ${isNumber}) && ("${maxIter}" =~ ${isNumber}) ]]
    then 
        echo -e "::BAD ARGUMENT TYPE::REQUIRED NUMBER::FOUND STRING\n${helpStr}" >&2; 
        exit 2;
    fi
    while (( maxIter-- > 0 )); do
        if [[ "${quiet}" -eq 1 ]]
        then 
            "${posArgs[@]:0:${commArgLen}}" &>/dev/null;
        else 
            "${posArgs[@]:0:${commArgLen}}";
        fi
        lastExCode="$?";
        if [[ -n "${cb}" ]]
        then 
            "${cb}" "${lastExCode}" "${maxIter}" "${posArgs[*]}";
        fi
        if [[ "${lastExCode}" -eq 0 ]]
        then 
            return 0;
        fi
        sleep "${interval}";
    done
    if [[ "${reflect}" -eq 1 ]]
    then
        return "${lastExCode}";
    fi;
    return 1;
)

####USAGE:
####whateva() {
####    echo -e "last exit code: ${1}\nmaxIter: ${2}\nFull command string: ${3}";
####}
####
####repTillEx0 "pidof" "memcached" "-quiet" "-callback" "whateva" "-reflect" "0.25" "40";