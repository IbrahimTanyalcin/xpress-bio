#!/bin/bash

shopt -s extglob

main() {
progName="${0}";
helpStr="$(sed 's/^\s*//' <<EOL 
    > ˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅
    > 10-2022 - Ibrahim Tanyalcin - MIT LICENSE
    > version 0.0.1
    > Downloads an attachment and optionally extracts and cleans up files with selected extensions if
    > the attachment was an archive ('.tar.gz', '.gz.tar', '.taz', '.tgz', '.gz'). Extraction is done
    > into a folder with randomly generated 33 character long hexadecimal string name. 
    >
    > SYNOPSIS:
    >-------------------------------------------------------------------------------------------------------------------------
    > ${progName} <URI: path-string> <DESTINATION-PATH: path-string> <[UNZIP: bool]> <[[EXTENSION-FILTER-WITH-DOT: string],...]>
    >-------------------------------------------------------------------------------------------------------------------------
    > NOTE: '--rm', '-rm', '--help', '-help' optional args are accepted anywhere in the command
    > USAGE: 
    > Download a file into destination and do nothing
    >     $ /bin/bash ${progName} 'https://example.com/X/Y/.../abc.tar.gz' './someFolder/someName.txt'
    > Download a .tar.gz, extract only '.bed' and '.fa' files into random folder
    >     $ /bin/bash ${progName} 'https://example.com/X/Y/.../abc.tar.gz' './someFolder/someName.tar.gz' 1 '.bed' '.fa'
    > Same as above but remove the arhive
    >     $ /bin/bash ${progName} 'https://example.com/X/Y/.../abc.tar.gz' --rm './someFolder/someName.tar.gz' 1 '.bed' '.fa'
    > Same as above but extract everything
    >     $ /bin/bash ${progName} 'https://example.com/X/Y/.../abc.tar.gz' --rm './someFolder/someName.tar.gz' 1 ''
    > Download the archive but do not extract
    >     $ /bin/bash ${progName} 'https://example.com/X/Y/.../abc.tar.gz' './someFolder/someName.tar.gz' 0
    > Zips/Tarballs are atomic by design, to replicate the same behavior with plain files, use (-)-atomic
    >     $ /bin/bash ${progName} 'https://example.com/X/Y/.../abc.fasta' --atomic ./someFolder/someName.fasta
    > If extract is set to 1, --atomic is ignored
    >     $ /bin/bash ${progName} -atomic 'https://example.com/X/Y/.../abc.tar.gz' --rm './someFolder/someName.tar.gz' 1 ''
    > ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
EOL
)"

if [[ "$*" == ?(*[[:space:]])?(-)-help?([[:space:]]*) ]]
then
    echo "${helpStr}";
    exit 0;
fi

splitting=0;
posArgs=();
curlArgs=();
atomicArgs=();
for((i=1; i<="$#"; ++i))
do
    if [[ "${!i}" == "--" ]]; then
        splitting=1;
        continue;
    fi
    if [[ "$splitting" -eq 1 ]]; then
        curlArgs+=("${!i}");
        continue;
    fi
    if [[ "${!i}" == ?(-)-rm ]]
    then 
        rmArch=1;
    elif [[ "${!i}" == ?(-)-atomic ]]
    then
        atomic=1;
        (( ++i ));
        atomicArgs+=("${!i}");
    else
        posArgs+=("${!i}");
    fi
done

set -o pipefail -- "${posArgs[@]}"

if [[ "${#@}" -lt 2 ]]
then
    echo -e "::INCOMPLETE ARGUMENTS::\n${helpStr}" >&2; 
    exit 1;
fi

if [[ "${3}" != 0 ]] && [[ "${3}" != false ]] && [[ -n "${3}" ]]; then
    extractArch=1;
    atomic=0;
elif [[ "${atomic}" == 1 ]]; then
    if [[ ! -d "${atomicArgs[0]}" ]]; then
        echo -e "::FAULTY ARGUMENT::\n${atomicArgs[0]} is not a directory." >&2;
        exit 1;
    else
        atomicArgs+=("${2}")
        atomicFile="$(makeAtomicFile "${atomicArgs[@]}")"
        if [[ $? -ne 0 ]]; then 
            echo -e "::FAILED ATOMIC::\nCould not create a temporary atomic file." >&2;
            exit 1;
        fi
    fi
fi

#regex to extract percentage
rgx='^[^0-9%]*?([0-9]+\.[0-9]+%)';

curl -fL --progress-bar "${curlArgs[@]}" "${1}" 2>&1 > "${atomicFile:-${2}}" | while read -r -d $'\r'; do 
    if [[ "$REPLY" =~ $rgx ]]
    then 
       stdbuf -oL echo -ne "\r${BASH_REMATCH[1]}"
    fi
done

cleanupAtomicFile "${atomicArgs[@]}"

if [[ "${extractArch}" == 1 ]]
then
    destFolder="$(dirname "${2}")";
    absDestFolder="$(readlink -f -- "${destFolder}")";
    destFilename="$(basename "${2}")";
    randFolder="H$(hexdump -vn16 -e'4/4 "%08X" 1 "\n"' /dev/urandom)";
    tempFolder="${destFolder}/${randFolder}";
    extOuter="${2##*.}";
    extOuterRm="${2: 0:$((-${#extOuter} - 1))}";
    extInner="${extOuterRm##*.}";
    mkdir "${tempFolder}";

    #append asterisks to extensions, empty string will extact everything
    #not even an emtpy string as extension will throw error with tar
    rest=( "${@:4}" );
    for ((i=0; i<"${#rest[@]}"; i++))
    do
        rest[$i]='*'"${rest[$i]}"
    done

    #if you are downloading a tarball, you must specify at least '' as extension
    mustSpecifyExt() {
        if [[ "${#rest[@]}" -eq 0 ]]
        then
            echo "if UNZIP is set and archive is a tarball, EXTENSION-FILTER should also be set" >&2;
            exit 1;
        fi
    }

    #not all versions of tar can guess the compression algorithm by inspecting the first few bytes
    case ".${extInner,,}.${extOuter,,}" in
        #consider -I --use-compress-program option for lz4
        .tar.gz|.tar.z|.gz.tar|!(*.gz|*.lz4).tar!(.gz|.lz4)|*.tgz|*.taz)
            mustSpecifyExt
            tar "-$([[ \
            "${extOuter}" == gz \
            || "${extOuter}" == Z \
            || "${extOuter}" == taz \
            || "${extOuter}" == tgz \
            || "${extInner}" == gz \
            ]] && echo z || echo "")"xf "${2}" \
            -C "${tempFolder}" \
            --transform='s/.*\///' \
            --wildcards "${rest[@]}" \
            2>/dev/null || :;
        ;;
        .tar.lz4|.lz4.tar)
            mustSpecifyExt
            lz4 -dc --no-sparse "${2}" | tar xf - \
            -C "${tempFolder}" \
            --transform='s/.*\///' \
            --wildcards "${rest[@]}" \
            2>/dev/null || :;
        ;;
        #consider -c option to stdout
        #consider -k --keep option too
        !(.tar).gz)
            mv "${2}" "${tempFolder}";
            gzip -dq "${tempFolder}/${destFilename}" 2>/dev/null || :;
        ;;
        !(.tar).lz4)
            lz4 -dc --no-sparse "${2}" > "${tempFolder}/${extOuterRm}" \
            2>/dev/null || :;
        ;;
    esac
    cd "${absDestFolder}"
    find "${tempFolder}" ! -path "${tempFolder}" -type d -empty -delete;
    if [[ ${rmArch} ]]
    then
        rm "${2}" 2>/dev/null || :;
    fi
    echo -ne "\r${tempFolder}";
fi
}

makeTempDir() {
    local temp_dir="$(mktemp -d -p "${1}" temp.XXXXXXXX)";
    if [[ -d "$temp_dir" ]] && chmod 755 "$temp_dir";then
        echo "$temp_dir";
    else
        echo "could not create a temporary directory temp.XXXXXXXX under ${1}" >&2;
        exit 1;
    fi
}

isTempDir(){
    if [[ -z "$1" ]] || [[ ${#1} -lt 2 ]]; then
        echo "Error: Temporary directory name is too short or not specified." >&2;
        return 1
    fi
    if [[ ! "$1" =~ temp\.[a-zA-Z0-9_]+$ ]]; then
        echo "Error: Temporary directory name contains invalid characters." >&2;
        return 1
    fi
}

makeAtomicFile() {
    local temp_dir="$(makeTempDir "${1}")";
    if [[ $? -ne 0 ]]; then return 1; fi
    echo "$temp_dir/$(basename "${2}")";
}

cleanupAtomicFile() {
    if [[ "${atomic}" != 1 ]]; then return; fi
    mv "${atomicFile}" "${2}";
    local temp_folder="$(dirname "${atomicFile}")";
    if isTempDir "${temp_folder}"; then
        rm -r "${temp_folder}";
    else
        echo -e "::FAILED CLEANUP::\nCould not delete the temporary directory ${temp_folder}." >&2;
        exit 1;
    fi
}

unshift() {
    local -n arr=$2
    arr=("$1" "${arr[@]}")
}

main "$@"; exit;

#USEFUL liners

#find "${tempFolder}" -maxdepth 1 -type f -print0 | xargs -0 -I {} mv {} "${destFolder}";

#echo $(IFS=$'|' ; echo "${rest[*]}"); //*.fa|*.fasta

#if [[ -z "${4}" ]] -> test if zero length string, won't be useful here because '' 
#is allowed as extension
