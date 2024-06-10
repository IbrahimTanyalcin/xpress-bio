import registerHover from "./registerHover.js";
import registerResponsive from "./registerResponsive.js";

const rndGen = taskq._exportPersist.genHexStr,
    renderTable = ({cols, rows, keys, contentArea, modal, ...options}) => {
        const rndID = rndGen(8, 2, "table-viewer-table-");
        let offset = "2rem";
        ch`
        -> ${contentArea}
        style ${[
            ["display", "unset"],
            ["justify-content", "unset"],
            ["align-items", "unset"],
            ["overflow-y", "scroll"]
        ]}
        *> ${"table"} |> sappend ${0} |< exec ${() => () => ch.stash(ch.selected)}
        addClass ${["responsive-table-type-1"]}
        satr id ${rndID}
        style ${[
            ["--total-width",  `calc( ${modal.__width}px - ${offset} )`]
        ]}
        *> ${"thead"} |> sappend ${0}
        *> ${"tr"} |> sappend ${0}
        *> ${Array(cols.length).fill("th")} |> append ${0}
        &> ${() => (th, i) => {
            ch(th)`
            satr title ${cols[i]} |< set ${"textContent"}
            `
        }}
        => ${() => () => ch(ch.recall())}
        *> ${"tbody"} |> sappend ${0}
        *> ${Array(rows.length).fill("tr")} |> append ${0}
        &> ${() => (tr, i) => {
            ch(tr)`
            >> __index ${i}
            *> ${Array(rows[i].length).fill("td")} |> append ${0}
            &> ${() => (td, ii) => {
                ch(td)`
                >> textContent ${rows[i][ii]}
                `
            }}
            `
        }}
        `;
        registerResponsive({modal, tableID: rndID, offset, ...options});
        registerHover({modal, table: document.getElementById(rndID), cols, keys, rows, ...options});
    }

export default renderTable;