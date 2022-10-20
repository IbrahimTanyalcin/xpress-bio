#!/bin/bash

shopt -s extglob

progName="${0}";
helpStr="$(sed 's/^\s*//' <<EOL 
    > ˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅
    > 10-2022 - Ibrahim Tanyalcin - MIT LICENSE
    >
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
    > Download the archive but do not extract
    >     $ /bin/bash ${progName} 'https://example.com/X/Y/.../abc.tar.gz' './someFolder/someName.tar.gz' 0
    > ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
EOL
)"

if [[ "$*" == ?(*[[:space:]])?(-)-help?([[:space:]]*) ]]
then
    echo "${helpStr}";
    exit 0;
fi

posArgs=();
for((i=1; i<="$#"; ++i))
do
    if [[ "${!i}" == ?(-)-rm ]]
    then 
        rmArch=1;
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

rgx='^[^0-9%]*?([0-9]+\.[0-9]+%)';

curl -fL --progress-bar "${1}" 2>&1 > "${2}" | while read -r -d $'\r'; do 
    if [[ "$REPLY" =~ $rgx ]]
    then 
       stdbuf -oL echo -ne "\r${BASH_REMATCH[1]}"
    fi
done

if [[ "${3}" != 0 ]] && [[ "${3}" != false ]] && [[ -n "${3}" ]]
then
    destFolder="$(dirname "${2}")";
    destFilename="$(basename "${2}")";
    randFolder="H$(hexdump -vn16 -e'4/4 "%08X" 1 "\n"' /dev/urandom)";
    tempFolder="${destFolder}/${randFolder}";
    extOuter="${2##*.}";
    extOuterRm="${2: 0:$((-${#extOuter} - 1))}";
    extInner="${extOuterRm##*.}";
    mkdir "${tempFolder}";
    case ".${extInner,,}.${extOuter,,}" in
        .tar.gz|.tar.z|.gz.tar|*.tar!(.gz)|*.tgz|*.taz)
            if [[ -z "${4}" ]]
            then
                echo "if UNZIP is set and archive is a tarball, EXTENSION-FILTER should also be set" >&2; 
                exit 1;
            fi
            rest=( ${@:4} );
            for ((i=0; i<"${#rest[@]}"; i++))
            do
                rest[$i]='*'"${rest[$i]}"
            done
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
        !(.tar).gz)
            mv "${2}" "${tempFolder}";
            gzip -dq "${tempFolder}/${destFilename}" 2>/dev/null || :;
        ;;
    esac
    find "${tempFolder}" ! -path "${tempFolder}" -type d -empty -delete;
    if [[ ${rmArch} ]]
    then
        rm "${2}" 2>/dev/null || :;
    fi
    echo -ne "\r${tempFolder}";
fi

#USEFUL liners
#find "${tempFolder}" -maxdepth 1 -type f -print0 | xargs -0 -I {} mv {} "${destFolder}";
#echo $(IFS=$'|' ; echo "${rest[*]}"); //*.fa|*.fasta
