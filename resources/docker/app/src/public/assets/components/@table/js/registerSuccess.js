
const rndGen = taskq._exportPersist.genHexStr,
    registerSuccess = (modal) => {
        const issueSuccess = ({ msg = "", fadeout = 5000 }) => {
            const rndID = rndGen(8, 2, "table-viewer-close-button-");
            ch(modal)`
            *> ${"div"} |> sappend ${0}
            addClass ${["success-msg", "animated", "fadeInLeft"]}
            >> innerHTML ${`<i 
                    class="fa fa-check-circle">
                </i>
                ${msg || ""}
                <i 
                    data-random-id='${rndID}'
                    onclick=${`'
                        const that = this.parentElement;
                        ch(that)
                        .addClass("fadeOutLeft")
                        .animate([],{duration:1000})
                        .pipe("await", () => {
                            ch(that.parentElement).rm([that]);
                        });
                    '`}
                    class="fa fa-close">
                </i>`}
            => ${() => () => setTimeout(
                () => ch.select(`[data-random-id=${rndID}]`, modal)
                    ?.selected
                    ?.click(),
                fadeout)}
            `
        };
        modal.issueSuccess = issueSuccess;
    }

export default registerSuccess;