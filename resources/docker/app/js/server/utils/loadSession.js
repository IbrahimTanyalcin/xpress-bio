const
    {log} = require("../../helpers.js"),
    genHexStr = require("../../genHexStr"),
    session = require("express-session"),
    MemcachedStore = require("connect-memcached")(session);
module.exports = async function ({express, app, info, files}) {
    const undef = void(0),
          //proxy is undefined below on purpose, set it from express
          defSessConf = {
            resave: false,
            saveUninitialized: false,
            cookie: {
                "maxAge": 86400000 
            }
          },
          defMemsessConf = {
            "ttl": 86400
          },
          sessConf = Object.assign(
                {...defSessConf},
                {cookie: {
                    "maxAge": 86400000 
                }},
                info?.serverConf?.session?.session ?? log(
                    "No express-session session config has been detected, using defaults:",
                    `${JSON.stringify(defSessConf, null, "\t")}`
                )
          ),
          memsessConf = Object.assign(
            {...defMemsessConf},
            info?.serverConf?.session?.memcached ?? log(
                "No connect-memcached session config has been detected, using defaults:",
                `${JSON.stringify(defMemsessConf, null, "\t")}`
            )
          );
    sessConf?.name ?? (
        log(
            "No name for session cookie has been detected. Default 'connect.sid' might clash",
            "with other session cookies on the same site. Generating random hex string."
        ),
        sessConf.name = genHexStr()
    );
    const envSessSecret = info?.serverConf?.session?.["env-session-secret"],
          sessSecret = process.env?.[envSessSecret],
          envMemsessSecret = info?.serverConf?.session?.["env-memcached-secret"],
          memsessSecret = process.env?.[envMemsessSecret];
    if (sessSecret) {
        sessConf.secret = sessSecret;
    } else {
        log("No express-session session secrets were given. Generating random hex string.");
        sessConf.secret = genHexStr(8, 3, "secret_");
    }
    if (memsessSecret) {
        memsessConf.secret = memsessSecret;
    } else {
        log("No connect-memcached secrets were given. Generating random hex string.");
        memsessConf.secret = genHexStr(8, 3, "memsecret_");
    }
    sessConf.store = new MemcachedStore(memsessConf);
    app.use(session(sessConf));
}