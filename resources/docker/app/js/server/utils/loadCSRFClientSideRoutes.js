const
    {log} = require("../../helpers.js");
module.exports = async function ({express, app, info, files, serverSent}) {
    const undef = void(0);
    Object.entries(info?.serverConf?.["csrf-client-side"]?.mounts ?? {}).forEach(([mount, oMount]) => {
        if(oMount?.isRegExp){
            mount = new RegExp(mount, oMount.RegExpFlags);
        }
        const mountRouter = express.Router();
        Object.entries(oMount?.routes ?? {}).forEach(([route, oRoute]) => {
            log("PROCESSING ", route); 
            const routeRouter = express.Router(),
                  message = oRoute?.message ?? "Your headers do not match.",
                  minPassCount = +oRoute?.["min-pass-count"] || 0,
                  oTest = []; //[{headerName: "referer", headerTest": () => ...}, {...]
            if(oRoute?.isRegExp){
                route = new RegExp(route, oRoute.RegExpFlags);
            }
            oRoute?.headers.forEach(oHeader => {
                const header = oHeader?.header,
                      value = oHeader?.value;
                (header && value) ?? (()=>{throw new Error(
                    `'header/value' field(s) are missing in ${JSON.stringify(oHeader, null, "\t")}`
                )})();
                switch (((value instanceof Array) << 1) + (!!oHeader?.isRegExp << 0)) {
                    case 3:
                        oTest.push((()=>{
                            const subTest = [];
                            value.forEach((value, i) => {
                                subTest.push(new RegExp(value, oHeader?.RegExpFlags.replace("g",function(m){
                                    !i && log(`g flags will be stripped off from ${JSON.stringify(oHeader, null, "\t")}`);
                                    return "";
                                })));
                            });
                            return  {   
                                headerName: header,
                                headerTest: reqHeaderVal => subTest.some(headerTest => headerTest.test(reqHeaderVal))
                            };
                        })());
                        break;
                    case 2:
                        oTest.push((()=>{
                            const subTest = [...value];
                            return  {
                                headerName: header,
                                headerTest: reqHeaderVal => subTest.some(headerTest => {
                                    if (headerTest.startsWith("^")){
                                        return reqHeaderVal.startsWith(headerTest.slice(1))
                                    } 
                                    return reqHeaderVal.includes(headerTest);
                                })
                            };
                        })());
                        break;
                    case 1: {
                        const subTest = new RegExp(value, oHeader?.RegExpFlags.replace("g",function(m){
                            log(`g flags will be stripped off from ${JSON.stringify(oHeader, null, "\t")}`);
                            return "";
                        }));
                        oTest.push({
                            headerName: header,
                            headerTest: reqHeaderVal => subTest.test(reqHeaderVal)
                        });
                        break;
                    }
                    case 0: 
                        oTest.push({
                            headerName: header,
                            headerTest:reqHeaderVal => {
                                if (value.startsWith("^")){
                                    return reqHeaderVal.startsWith(value.slice(1))
                                } 
                                return reqHeaderVal.includes(value);
                             }
                        });
                        break;
                    default:
                        throw new Error(
                            `There was a problem parsing ${JSON.stringify(oRoute, null, "\t")}`
                        )
                }
            });
            if (oTest.length < minPassCount) {
                log(
                    `minPassCount (${minPassCount}) parameter cannot be larger than test (${oTest.length}) count`,
                    `current test: ${JSON.stringify(oTest, function(k,v){
                        if(v instanceof Function) {
                            const strVal = v.toString();
                            if(strVal.length > 23) {
                                return v.toString().slice(0,20) + "...";
                            } else {
                                return v.toString();
                            }
                        } else {
                            return v;
                        }
                    }, "\t")}`
                );
                throw new Error("Invalid min-pass-count value");
            }
            (oRoute?.method.toLowerCase() || "get").split("|").forEach(method => {
                routeRouter[method](route, function(req, res, next){
                    let passCount = 0; 
                    oTest.forEach(({headerName, headerTest}) => {
                        //console.log("passing", headerName, headerTest, String(req.get(headerName)));
                        passCount += headerTest(String(req.get(headerName)));
                    });
                    if(passCount < minPassCount) {
                        res.status(403).send({
                            "http-status": 403, 
                            message
                        });
                    } else {
                        next();
                    }
                });
            });
            mountRouter.use(mount, routeRouter);
        });
        app.use(mountRouter);
    });
}