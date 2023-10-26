function igvApplet({name, attrs, styles, props, data, el}){
    const ch = ch2;
    const {values, d, IGVBrowsers} = data;
    /*
    d is something like {
        browser, //browser instance returned from IGV or undef
        oIGV, //the object returned from createIGVObject
        order //a number, not used yet
    } 
    d is an element of values.data
    values.data holds the reference to proxy array
    */
    ch`
    -> ${el}
    style ${[
        ["display", "block"]
    ]}
    => ${() => () => {
        let node = ch.selected;
        requestAnimationFrame(() => {
            ch.addClass(
                ["animated", "fadeInUp"],
                node
            )
        })
    }}
    animate ...${[[],{duration:1000}]}
    >> dataRef ${d}
    +> ${ch`
        <igv-toolbar ${{ data }}/>
    `.selected}
    -> ${el}
    +-> igvContainer:${ch.div}
    => ${({values:v}) => () => {
        igv.createBrowser(v.igvContainer, d.oIGV)
        .then(browser => {
            IGVBrowsers.browsers.add(d.browser = browser);
            console.log("igv rendered");
        })
    }}
    `
}

export const render = igvApplet;