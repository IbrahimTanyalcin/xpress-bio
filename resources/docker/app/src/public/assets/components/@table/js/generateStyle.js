let once;
function generateStyle (outerBarcode) {
    if (once){return}
    once = 1;
    ch(document.head)`
        *> ${"style"} |> sappend ${0}
        >> textContent ${`
            .${outerBarcode} .info-msg,
            .${outerBarcode} .success-msg,
            .${outerBarcode} .warning-msg,
            .${outerBarcode} .error-msg {
                margin: 10px;
                padding: 10px;
                border-radius: 3px 3px 3px 3px;
                box-sizing: border-box;
                position: sticky;
                top: max(1rem, 6%);
                display: flex;
                align-items: center;
                justify-content: space-between;
                color: var(--font-color-light);
                z-index: 1;
            }
            .${outerBarcode} .info-msg {
                background-color: var(--info-color);
                user-select: text;
                word-break: break-all;
            }
            .${outerBarcode} .success-msg {
                background-color: var(--success-color);
            }
            .${outerBarcode} .warning-msg {
                background-color: var(--warning-color);
                /* cursor: pointer; */
            }
            .${outerBarcode} .error-msg {
                background-color: var(--error-color);
            }
            /* .${outerBarcode} .warning-msg:hover {
                border: 2px solid;
            } */
        `}
    `
}

export default generateStyle