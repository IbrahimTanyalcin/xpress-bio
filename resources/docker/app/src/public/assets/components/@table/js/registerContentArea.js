
const rndGen = taskq._exportPersist.genHexStr,
    registerContentArea = (modal) => {
        const rndID = rndGen(8, 2, "table-viewer-");
        ch(modal)`
        *> ${"div"} |> sappend ${0}
        style ${[
            ["position", "absolute"],
            ["top", "max(1rem, 5%)"],
            ["left", "1%"],
            ["width", "98%"],
            ["height", "calc(100% - max(1.4rem, 6%))"],
            ["display", "flex"],
            ["justify-content", "center"],
            ["align-items", "center"]
        ]}
        satr data-random-id ${rndID}`
        return {rndID, node: ch.selected}
        /* 
        ch`@> ...${[`[data-random-id=${rndID}]`, document.body]}
        `; 
        */
    }

export default registerContentArea;