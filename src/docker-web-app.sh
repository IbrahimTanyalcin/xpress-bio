#!/bin/bash

teeOutput="docker-output.txt"
maxIter=10
currIter=0

main() {
    set -e -x -o pipefail
    ####################################################################
    #for future reference, one can access dxapp.json variables like so:
    #echo "${input_name[@]}";
    ####################################################################
    docker load < ./express-test.tar
    (docker run --rm --name web-test -p 443:3000 express-test:trial-seven) | tee "$teeOutput" &
    iter
    fixedAssets
    set -e -x
    echo 'main::OK';
    tail -f /dev/null;
}

iter() {
    set +e +x
    while true ; do
        if [[ (("$currIter" -ge "$maxIter")) ]]
        then
            echo 'Max iterations reached. Exiting'
            return 1
        fi
        if [[ ! -f "$teeOutput" ]]
        then 
            sleep 1
            ((currIter++))
            continue
        fi
        if grep -isqE -m 1 'listening\s+on\s+host' "$teeOutput"
        then
            sed 's/^\s*//' <<EOL 
                > ˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅˅
                > Docker container seems to be running.
                > Executing rest of the commands.
                > ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
EOL
            echo 'The fish does not think. Or does he not!!!?' > test-text.txt && \
                docker cp test-text.txt web-test:app/src/public/assets/;
            dx-download-all-inputs && \
                while read -r -d $'\0'; do 
                    docker cp "$REPLY" web-test:app/src/public/assets/bam/;
                    echo "$REPLY"
                done < <(find "$HOME/in/bam_files/"* -type f -print0)
            break
        else 
            sleep 1
            ((currIter++))
            continue
        fi
        ((currIter++))
        continue
    done
}

fixedAssets() {
    #these are fixed reference files
    ####docker cp ./GCF_003668045.3_CriGri-PICRH-1.0_genomic.fasta web-test:app/src/public/assets/fa/;
    ####docker cp ./GCF_003668045.3_CriGri-PICRH-1.0_genomic.fasta.fai web-test:app/src/public/assets/fai/;
    #these are fixed assets that are optional
    #they will be switched with inputs from the user
    ####docker cp ./GCF_DHFR-gB-C35_S19_L001_merged.bam web-test:app/src/public/assets/bam/;
    ####docker cp ./GCF_DHFR-gB-C35_S19_L001_merged.bam.bai web-test:app/src/public/assets/bai/;
}