!function({
    loadCSSAsync,
    loadScriptAsync,
    helpButton,
    expandButton,
    side
}){
    Promise.all([
        loadCSSAsync("static/css/shepherd.css"),
        loadScriptAsync("static/js/shepherd.min.js")
    ]).then((srcs) => {
        const tour = new Shepherd.Tour({
            tourName: "help",
            useModalOverlay: true,
            exitOnEsc: true,
            defaultStepOptions: {
                //scrollTo: true /* breaks the hexgrid */
            }
        });
        tour.addSteps([{
            id: 'what-this-tool-does',
            text: 'This tool allows you upload fasta and bam files and visualize alignments',
            cancelIcon: {
                enabled: true,
                label: "cancel"
            },
            buttons: [
                {
                    label: 'Back',
                    text: 'Back',
                    action: tour.back
                },
                {
                    label: 'Next',
                    text: 'Next',
                    action: tour.next
                }
            ]
        },
        {
            id: 'app-metrics',
            text: 'Here you can see general server info like `Available Disk Space`, `Used Disk Space ` and `CPU` usage',
            attachTo: {
                element: 'div.grid-main-container',
                on: 'bottom'
            },
            cancelIcon: {
                enabled: true,
                label: "cancel"
            },
            buttons: [
                {
                    label: 'Back',
                    text: 'Back',
                    action: tour.back
                },
                {
                    label: 'Next',
                    text: 'Next',
                    action: tour.next
                }
            ]
        },
        {
            id: 'fasta-selection',
            text: [
                'Here you can select the fasta file to act as your REFERENCE for the alignments',
                'Each time you select a different file, you can see its file size right above.'
            ].join("\n"),
            attachTo: {
                element: '#pwd-select-template-2',
                on: 'bottom'
            },
            cancelIcon: {
                enabled: true,
                label: "cancel"
            },
            buttons: [
                {
                    label: 'Back',
                    text: 'Back',
                    action: tour.back
                },
                {
                    label: 'Next',
                    text: 'Next',
                    action: tour.next
                }
            ]
        },
        {
            id: 'open-analyze',
            text: [
                'Once you select your fasta reference file, head over to analyze side panel'
            ].join("\n"),
            cancelIcon: {
                enabled: true,
                label: "cancel"
            },
            buttons: [
                {
                    label: 'Back',
                    text: 'Back',
                    action: tour.back
                },
                {
                    label: 'Next',
                    text: 'Next',
                    action: tour.next
                }
            ]
        },
        {
            id: 'bam-selection',
            beforeShowPromise: function(){
                return new Promise(function(res,rej){
                    if (!~[...side.classList].indexOf("expanded")) {
                        expandButton.click();
                        setTimeout(() => res(), 1250);
                        return;
                    }
                    res();
                });
            },
            text: [
                'Now select the bam file to display against the reference'
            ].join("\n"),
            attachTo: {
                element: '#pwd-select-template',
                on: 'bottom'
            },
            cancelIcon: {
                enabled: true,
                label: "cancel"
            },
            buttons: [
                {
                    label: 'Back',
                    text: 'Back',
                    action: tour.back
                },
                {
                    label: 'Next',
                    text: 'Next',
                    action: tour.next
                }
            ]
        },
        {
            id: 'visualize',
            text: [
                'Click on visualize to render IGV'
            ].join("\n"),
            attachTo: {
                element: '#pwd-action',
                on: 'bottom'
            },
            cancelIcon: {
                enabled: true,
                label: "cancel"
            },
            buttons: [
                {
                    label: 'Back',
                    text: 'Back',
                    action: tour.back
                },
                {
                    label: 'Next',
                    text: 'Next',
                    action: tour.next
                }
            ]
        },
        {
            id: 'post-visualize',
            text: [
                'Thats it! At any time, you can select new fasta/bam files from the drop down menu',
                'and click visualize to refresh.'
            ].join("\n"),
            cancelIcon: {
                enabled: true,
                label: "cancel"
            },
            buttons: [
                {
                    label: 'Back',
                    text: 'Back',
                    action: tour.back
                },
                {
                    label: 'Next',
                    text: 'Next',
                    action: tour.next
                }
            ]
        },
        {
            id: 'upload',
            text: [
                'If you need to add new files, you can upload them using the upload button.',
                'You can only copy/paste DNA-Nexus links. `.fasta`, `.fa`, `.fai`, `.bam`, `.bai`, `.tar.gz`, `tar.lz4` or similar files are accepted.'
            ].join("\n"),
            attachTo: {
                element: '#pwd-upload',
                on: 'bottom'
            },
            cancelIcon: {
                enabled: true,
                label: "cancel"
            },
            buttons: [
                {
                    label: 'Back',
                    text: 'Back',
                    action: tour.back
                },
                {
                    label: 'OK',
                    text: 'OK',
                    action: tour.next
                }
            ]
        }]);
        helpButton.addEventListener("click", function(){
            tour.start();
        });
        helpButton.click();
    });
}(taskq._exportPersist);