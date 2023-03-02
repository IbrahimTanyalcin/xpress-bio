
const rndGen = taskq._exportPersist.genHexStr,
    registerError = (modal) => {
        const issueError = ({ msg = "", fadeout = 5000 }) => {
            const rndID = rndGen(8, 2, "table-viewer-close-button-");
            ch(modal)`
            *> ${"div"} |> sappend ${0}
            addClass ${["error-msg", "animated", "fadeInLeft"]}
            >> innerHTML ${`<i 
                    class="fa fa-times-circle">
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
        modal.issueError = issueError;
    }

export default registerError;