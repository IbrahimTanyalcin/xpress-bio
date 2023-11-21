#!/bin/bash

teeOutput="docker-output.txt"
maxIter=10
currIter=0
appName="web-app-igv"
semverVersion="0.1.1"

main() {
    set -e -x -o pipefail
    ####################################################################
    #for future reference, one can access dxapp.json variables like so:
    #echo "${input_name[@]}";
    ####################################################################
    docker load < ./xpress-bio.tar
    (docker run --rm --name "${appName}" -e XPRESS_BIO_FIELDS="$( (cat <<EOF
    {
      "x-options": {
        "+rm": [
          "GCF_003668045.3_CriGri-PICRH-1.0_genomic.fasta",
          "GCF_003668045.3_CriGri-PICRH-1.0_genomic.fasta.fai",
          "GCF_DHFR-gB-C35_S19_L001_merged.bam",
          "GCF_DHFR-gB-C35_S19_L001_merged.bam.bai",
          "pJW48_reference.fa",
          "pJW48_reference.fa.fai",
          "FAQ47368_pass_58f2b97a_0.mapped.bam",
          "FAQ47368_pass_58f2b97a_0.mapped.bam.bai",
          "FAQ47368_pass_58f2b97a_1.mapped.bam",
          "FAQ47368_pass_58f2b97a_1.mapped.bam.bai",
          "FAQ47368_pass_58f2b97a_2.mapped.bam",
          "FAQ47368_pass_58f2b97a_2.mapped.bam.bai",
          "FAQ47368_pass_58f2b97a_3.mapped.bam",
          "FAQ47368_pass_58f2b97a_3.mapped.bam.bai",
          "FAQ47368_pass_58f2b97a_4.mapped.bam",
          "FAQ47368_pass_58f2b97a_4.mapped.bam.bai"
        ]
      }
    }
EOF
    ) | base64 -w 0)" -p 443:3000 xpress-bio:igv-bam-"${semverVersion//./}") | tee "$teeOutput" &
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
                docker cp test-text.txt "${appName}":app/src/public/assets/;
            dx-download-all-inputs && \
                while read -r -d $'\0'; do 
                    docker cp "$REPLY" "${appName}":app/src/public/assets/bam/;
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
    return
    #these are fixed reference files
    ####docker cp ./GCF_003668045.3_CriGri-PICRH-1.0_genomic.fasta "${appName}":app/src/public/assets/fa/;
    ####docker cp ./GCF_003668045.3_CriGri-PICRH-1.0_genomic.fasta.fai "${appName}":app/src/public/assets/fai/;
    #these are fixed assets that are optional
    #they will be switched with inputs from the user
    ####docker cp ./GCF_DHFR-gB-C35_S19_L001_merged.bam "${appName}":app/src/public/assets/bam/;
    ####docker cp ./GCF_DHFR-gB-C35_S19_L001_merged.bam.bai "${appName}":app/src/public/assets/bai/;
}