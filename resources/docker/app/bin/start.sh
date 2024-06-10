#!/bin/bash

if [[ "$(service --status-all 2>&1 | grep 'memcached' | sed -r 's/^\s*\[\s*([-+?])\s*\].*$/\1/i')" != "+" ]]
then
    sed 's/^\s*//' <<EOL 
                > ˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅
                > memcache service is not running.
                > starting memcached.
                > ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
EOL
    scriptFolder="$( dirname ${BASH_SOURCE[0]} )";
    scriptName="$( basename ${BASH_SOURCE[0]} )";
    source "${scriptFolder}/repTillEx0.sh";
    service memcached start;
    repTillEx0 "pidof" "memcached" "--reflect" "0.25" "20";
    if [[ "$?" -ne 0 ]]
    then
        echo -e "Memcached failed to start.\
                Perhaps you need to run with 'sudo':\n \
                \"sudo /bin/bash ${scriptFolder}/${scriptName}\"" \
                | awk '{$1=$1};1';
        exit 1;
    fi
fi

#set -- --npm -foo bar -baz qux -- --env "somevar=somevalstart" --nodemon -pqrs qwyu --ENV "someOtherEnv=someOtherVal" -- anotherArg -- foo barr --baz qux;
cmdArgs=("$@")
npmArgs=()
nodemonArgs=(-e js,mjs,json,txt --ignore 'src/public/assets/\*\*/\*')
nodeArgs=(--no-daemon)
declare -n currCtx=nodeArgs;

for (( i=0; i<"${#cmdArgs[@]}"; ++i )) 
do
    case "${cmdArgs[$i],,}" in
        --npm)
            declare -n currCtx=npmArgs
        ;;
        --nodemon)
            declare -n currCtx=nodemonArgs
        ;;
        --)
            declare -n currCtx=nodeArgs
        ;;
        --env)
            (( ++i ));
            if [[ -p "${cmdArgs[$i]}" ]]
            then
                declare -x "$(cat ${cmdArgs[$i]} | tr -d '\n')"
            else
                declare -x "${cmdArgs[$i]}"
            fi
        ;;
        --prod*)
            declare -x "NODE_ENV=production"
        ;;
        --dev*)
            declare -x "NODE_ENV=development"
        ;;
        *)
            currCtx+=("${cmdArgs[$i]}")
        ;;
    esac
done

#First -- is for omitting npm parameters,
#Second -- is for nodemon
allArgs=("${npmArgs[@]}" -- "${nodemonArgs[@]}" -- "${nodeArgs[@]}");
sed 's/^\s*//' <<EOL 
                > ˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅
                > Below args will be passed to node:
                > "${allArgs[@]}"
                > ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
EOL

set -x
isContainer=$(grep -isqE -m 1 'docker|lxc' /proc/1/cgroup && echo -n 1 || echo -n 0);
if [[ $isContainer == 1 ]]
then
    sed 's/^\s*//' <<EOL 
                > ˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅
                > Container mode is detected.
                > ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
EOL
    su IPV -s /bin/bash -c "cd /app && npm start ${allArgs[*]}"
else 
    cd "$(readlink -f -- "$(dirname -- "$(readlink -f -- "$0")")/..")"
    npm start "${allArgs[@]}"
fi

# echo $PWD;
# cd "$(readlink -f -- "$(dirname -- "$(readlink -f -- "$0")")/..")";
# echo $PWD;



#su - IPV -s /bin/bash -c "cd /app && npm start $*"

# declare -x "atestvar=atestval";
# su IPV -s /bin/bash -c "cd /app && npm start $*"

#npm start "$@"