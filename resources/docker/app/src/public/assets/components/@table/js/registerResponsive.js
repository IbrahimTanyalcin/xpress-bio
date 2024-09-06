
function registerResponsive({ modal, tableID, offset, ...options}) {
    let timeoutID = void (0),
        breakpoint = options?.breakpoint ?? 568;
    const table = document.getElementById(tableID),
        responsiveTable = new basictable(`#${tableID}`),
        switchResponsive = function (modal, event) {
            clearTimeout(timeoutID);
            timeoutID = setTimeout(() => {
                ch(table);
                if (modal.__width <= breakpoint && !table.isResponsive) {
                    ch.addClass("responsive");
                    responsiveTable.start();
                    table.isResponsive = 1;
                    offset = "1rem";
                } else if (modal.__width > breakpoint && table.isResponsive) {
                    ch.rmClass("responsive");
                    responsiveTable.stop();
                    table.isResponsive = 0;
                    offset = "2rem";
                }
                ch.style([
                    ["--total-width", `calc( ${modal.__width}px - ${offset} )`]
                ]);
            }, 250);
        };
    modal.__onResizeEnd(switchResponsive)
        .__onWindowResize(switchResponsive);
}

export default registerResponsive;
