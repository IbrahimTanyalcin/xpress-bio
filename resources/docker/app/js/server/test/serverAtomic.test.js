const
    {capture} = require('../../capture.js'),
    {getDirs} = require("../../getDirs.js"),
    {until} = require("../../helpers.js"),
    {resolve, join, basename} = require('path'),
    http = require('node:http'),
    kill = require('tree-kill'),
    serverDetails = {
        started: false,
        host: void(0),
        port: void(0),
        oProcess: null,
        timeout: 20000
    },
    rootProcess = capture(
        `/bin/bash ${resolve(
            __dirname,
            "..","..","..",
            "bin",
            "start.sh"
        )}`,
        {
            ondata: ((
                data = "", 
                rgx = /(?:\s+|^)listening\s+on\s+host\s*:\s*(?:>\s*)?(?<host>[^:\s]+)\s*:\s*(?<port>[0-9]+)/im,
                groups = void(0)
            ) => (chunk, cmdStr, rest) => {
                data += chunk;
                if (
                    !serverDetails.started
                    && (groups = rgx.exec(data)?.groups)
                ){
                    serverDetails.started = true;
                    Object.assign(serverDetails, groups);
                }
            })(),
            onstart: function(str, rest){
                serverDetails.oProcess = this;
            }
        }
    )
    .catch((err) => console.log(err));

describe(`checking the effect of atomicly downloading raw content and the integrity of their resulting index files`, () => {
    const
        scriptName = "downloadX.sh",
        sh = resolve(binFolder, scriptName),
        archive = "https://gist.github.com/IbrahimTanyalcin/efbbc63ab7295a0f7f9cd2092fb915fd/archive/53428dc74007356d528efd86b0ab6271a6271eab.tar.gz",
        rawPath = "https://gist.githubusercontent.com/IbrahimTanyalcin/efbbc63ab7295a0f7f9cd2092fb915fd/raw/53428dc74007356d528efd86b0ab6271a6271eab/",
        /*
            Below you will find google drive link to example-2.fas, a 25Mb test file.
            There are alternatives to this such as gist, as above, but it won't work atm
            with the API because the API first makes a HEAD request to check status code
            and filename, which github does NOT send for raw files. The other alternative
            is downloading a sequence of similar size from NCBI such as:
            https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=KE150195.1&rettype=fasta&retmode=text
            However this wont work too because NCBI does NOT support HEAD requests:
            https://github.com/ncbi/ncbi-vdb/issues/143#issuecomment-2028034364
            So this leaves me with google drive link I generated. The only problem
            with this approach is, if you need to run this test on corporate network/machine
            it will fail because you need to install their certificates. You can do this via
            going to drive.google.com from your browser and clicking on the padlock, then details
            and export Base64 encoded certificate chain (single is not enough). Convert EOL to Unix
            and copy them to your WSL2/linux, place them under /usr/local/share/ca-certificates
            and run sudo update-ca-certificates. This will re-transpile /etc/ssl/certs/ca-certificates.crt
            which is a concatenation of available CAs. We are not done! If running which curl gives you
            /usr/bin/curl you are good to go, but if you have anaconda installed and active environment
            your curl will point to anaconda's curl, so you need to set:
            export CURL_CA_BUNDLE="/etc/ssl/certs/ca-certificates.crt";
            inside your .bashrc.
        */
        googleDriveFas = "https://drive.usercontent.google.com/u/0/uc?id=19TgtJQ18GVHMMsTwfCn_f2yxZDMPxENE&export=download",
        preComputedHashes = {fas: "c872ae017ec1c37a4ddb384412347f26", fai: "15711f3e8c9512a599d2fada387db164"},
        rawFileNames = {fas: "example-2.fas", fai: "example-2.fas.fai", digest: "md5digest", archive: "archive.tar.gz"},
        allTempFiles = [
            resolve(fastaFolder, rawFileNames.fas),
            resolve(faiFolder, rawFileNames.fai)
        ],
        rawFiles = Object.fromEntries(Object.entries(rawFileNames).map(([k,v]) => [k, `${rawPath}${v}`])),
        assetsTempFolder = resolve(staticFolder, "temp"),
        log = console.log.bind(console),
        cleanUp = {value: void(0)}; 

    beforeAll(async () => {
        await until(function(){
            return serverDetails.started;
        }, {interval: 500})
        const results = await cleanUpFiles(allTempFiles);
        if (results.some(d => !!d)) {
            throw new Error([
                "Removal operation failed in ",
                "some of the files:\n",
                `${JSON.stringify(results)}`
            ].join(""))
        }
    })

    afterAll(async () => {
        kill(serverDetails.oProcess.pid);
        await rootProcess;
    })

    afterEach(async () => {
        const results = await cleanUpFiles(allTempFiles);
        if (results.some(d => !!d)) {
            throw new Error([
                "Removal operation failed in ",
                "some of the files:\n",
                `${JSON.stringify(results)}`
            ].join(""))
        }
    })

    test(`downloading *.tar.gz does not cause the bug of incomplete indexing because they are by design atomic`, async () => {
        /**
         * It is difficult to explain what the SSE raw data looks like
         * Please refer to fixtures/sse-examples with id 1.
         */
        expect.assertions(3);
        const
            rawData = {value: ''},
            cliResponse = await simulClient(serverDetails);
        cliResponse.setEncoding('utf8');
        cliResponse.on('data', chunk => rawData.value += chunk)
        await reqDwnld({
            URI: `http://${serverDetails.host}:${serverDetails.port}/dl/nexus`,
            cliResponse,
            postData: JSON.stringify({payload: archive})
        });
        const evtsMatchedAndOrdered = validateSSE(
            rawData,
            /event:\s*worker-dl-start/mi,
            /event:\s*worker-dl-success/mi,
            /*
            there is normally 'worker-dl-progress' event fired
            multiple times here, but github does not send
            'content-length' headers
            */
            new RegExp([
                "event:\\s*worker-dl-end\\n",
                "data:\\s*[A-Z0-9\\-]+?\\.tar\\.gz\\n\\n",
            ].join(""),"i")
        ),
        /* 
        Also server should send all clients a 'fa-file-stats'
        event right after 'worker-dl-success' event 
        */
        evtFaFileStats = validateSSE(
            /* 
            remove the first fa-file-stats event 
            on client connect 
            */
            () => ({
                value: rawData.value.slice(
                    rawData.value.indexOf("fa-file-stats") + 14
                )
            }),
            /event:\s*worker-dl-success/mi,
            new RegExp([
                "event:\\s*fa-file-stats\\n",
                "data:\\s*\\{\\n",
                "(?:data:\\s*\"[^\"]+\"\\s*:\\s*[0-9]+,?\\n)*?",
                `data:\\s*\"${rawFileNames.fas.replace(/\./g,"\\.")}\":\\s*[0-9]+,?\\n`,
                "(?:data:\\s*\"[^\"]+\"\\s*:\\s*[0-9]+,?\\n)*?",
                "data:\\s*\\}"
            ].join(""),"i")
        ),
        validateTimeout = setTimeout(() => {
            evtsMatchedAndOrdered.break();
            evtFaFileStats.break();
            console.log(rawData.value);
        }, serverDetails.timeout);
        expect(await evtsMatchedAndOrdered).toBe(true);
        expect(await evtFaFileStats).toBe(true);
        clearTimeout(validateTimeout);
        expect(await getHashes(...allTempFiles)).toEqual(Object.values(preComputedHashes));
    }, serverDetails.timeout);

    test("replicate the bug by explicitly downloading raw 'example-2.fas' into the 'fa' directory and examine the resulting fai's hash", async () => {
        /**
         * Refer to the 'sse-examples.txt' id 2 to see what the SSE 
         * event stream looks like
         */
        expect.assertions(2);
        const 
            rawData = {value: ''},
            cliResponse = await simulClient(serverDetails),
            dest = resolve(fastaFolder, rawFileNames.fas),
            destFai = resolve(faiFolder, rawFileNames.fai),
            indexingComplete = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-end/mi,
            );
        cliResponse.setEncoding('utf8');
        cliResponse.on('data', chunk => rawData.value += chunk);
        /**
         * The file 'example-2.fas' from the gist is about 25Mb
         * The idea is to slow down curl enough (500K) so that
         * the download process takes around 1 minute.
         * During this time, indexing thread will index the incomplete fasta
         * which will result in a fai file having a different hash
         */
        await capture(`/bin/bash ${sh} ${rawFiles.fas} ${dest} -- --limit-rate 500K`);
        expect(await indexingComplete).toBe(true);
        expect(await getHashes(destFai)).not.toEqual([preComputedHashes.fai]);
    }, serverDetails.timeout * 6);

    test(`demonstrate that the bug is resolved by adding the atomic argument to the bash script`, async () => {
        expect.assertions(3);
        let tempFolderDetected = false,
            watcher = until(async () => {
                if((await getDirs(assetsTempFolder)).some(d => basename(d).startsWith("temp."))) {
                    return tempFolderDetected = true;
                }
            }, {interval: 17});
        const
            dest = resolve(fastaFolder, rawFileNames.fas),
            rawData = {value: ''},
            cliResponse = await simulClient(serverDetails);
        cliResponse.setEncoding('utf8');
        cliResponse.on('data', chunk => rawData.value += chunk)
        capture(`/bin/bash ${sh} ${rawFiles.fas} ${dest} --atomic '${assetsTempFolder}' -- --limit-rate 500K`);
        const 
            indexingComplete = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-end/mi,
            ),
            validateTimeout = setTimeout(() => {
                indexingComplete.break();
                console.log(rawData.value);
            }, serverDetails.timeout * 6);
        expect(await indexingComplete).toBe(true);
        clearTimeout(validateTimeout);
        watcher.break();
        expect(tempFolderDetected).toBe(true);
        expect(await getHashes(...allTempFiles)).toEqual(Object.values(preComputedHashes));
    }, serverDetails.timeout * 6);

    test(`replicate the bug resolution, but this time using the API call`, async () => {
        expect.assertions(4);
        let tempFolderDetected = false,
            watcher = until(async () => {
                if((await getDirs(assetsTempFolder)).some(d => basename(d).startsWith("temp."))) {
                    return tempFolderDetected = true;
                }
            }, {interval: 17});
        const
            rawData = {value: ''},
            cliResponse = await simulClient(serverDetails);
        cliResponse.setEncoding('utf8');
        cliResponse.on('data', chunk => rawData.value += chunk)
        await reqDwnld({
            URI: `http://${serverDetails.host}:${serverDetails.port}/dl/nexus`,
            cliResponse,
            postData: JSON.stringify({payload: googleDriveFas})
        });
        const evtsMatchedAndOrdered = validateSSE(
            rawData,
            /event:\s*worker-dl-start/mi,
            /event:\s*worker-dl-success/mi,
            new RegExp([
                "event:\\s*worker-dl-end\\n",
                "data:\\s*[A-Z0-9\\-]+?\\.fas\\n\\n",
            ].join(""),"i")
        ),
        indexingComplete = validateSSE(
            rawData,
            /event:\s*worker-fasta-bam-index-end/mi,
        ),
        validateTimeout = setTimeout(() => {
            evtsMatchedAndOrdered.break();
            indexingComplete.break();
            console.log(rawData.value);
        }, serverDetails.timeout * 3);
        expect(await evtsMatchedAndOrdered).toBe(true);
        expect(await indexingComplete).toBe(true);
        clearTimeout(validateTimeout);
        watcher.break();
        expect(tempFolderDetected).toBe(true);
        expect(await getHashes(...allTempFiles)).toEqual(Object.values(preComputedHashes));
    }, serverDetails.timeout * 3);
});
