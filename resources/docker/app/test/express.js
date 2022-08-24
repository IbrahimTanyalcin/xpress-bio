const { application } = require('express');

const
    express = require('express'),
    app = express(),
    router1 = express.Router(),
    router2 = express.Router(),
    obj = [];

    app.use(function(req, res, next){
        console.log(obj[obj.length] = "use-1");
        next(); //does NOT accept 'router'
                    //route = ["use-1","router1-1","router1-2","router2-1","router2-2","get2-1","get3-1"]
    });

    router1.use(function(req, res, next){
        console.log(obj[obj.length] = "router1-use");
        next(); //router ["use-1","router1-use","router2-1","router2-2","get2-1","get2-2","get3-1","get4-1"]
                    //route ["use-1","router1-use","router1-get1-1","router1-get1-2","router1-get2-1","router1-get2-2","router2-1","router2-2","get2-1","get2-2","get3-1","get4-1"] --no effect if there is no method
    });

    router1.get("/",
        function(req, res, next){
            console.log(obj[obj.length] = "router1-get1-1");
            next(); //route ["use-1","router1-use","router1-get1-1","router1-get2-1","router1-get2-2","router2-1","router2-2","get2-1","get2-2","get3-1","get4-1"]
                    //router ["use-1","router1-use","router1-get1-1","router2-1","router2-2","get2-1","get2-2","get3-1","get4-1"]
        },
        function(req, res, next){
            console.log(obj[obj.length] = "router1-get1-2");
            next();
        }
    )

    router1.get(
        "/", 
        function(req, res, next){
            console.log(obj[obj.length] = "router1-get2-1");
            next(); //route = ["use-1","router1-1","router2-1","router2-2","get2-1","get3-1"]
                        //router = ["use-1","router1-1","router2-1","router2-2","get2-1","get3-1"]
        },
        function(req, res, next){
            console.log(obj[obj.length] = "router1-get2-2");
            next();
        }
    );
    
    app.use('/', router1);

    app.get(new RegExp('.*',"i"), function(req,res,next){
        res.send("CANNOT PASS!");
    })

    router2.get(
        "/", 
        function(req, res, next){
            console.log(obj[obj.length] = "router2-1");
            next(); //route ["use-1","router1-1","router1-2","router2-1","get2-1","get3-1"]
                        //router ["use-1","router1-1","router1-2","router2-1","get2-1","get3-1"]
        },
        function(req, res, next){
            console.log(obj[obj.length] = "router2-2");
            next();
        }
    )

    app.use('/', router2);

    app.get('/', 
        function(req, res, next) {
            console.log(obj[obj.length] = "get2-1");
            next(); //route ["use-1","router1-1","router1-2","router2-1","router2-2","get2-1","get3-1"]
                        //router Cannot GET /
        },
        function(req, res, next) {
            console.log(obj[obj.length] = "get2-2");
            next();
        }
    );

    app.get('/', function(req, res, next) {
        console.log(obj[obj.length] = "get3-1");
        next(); //route ["use-1","router1-1","router1-2","router2-1","router2-2","get2-1","get2-2","get3-1","get4-1"]
                    //router Cannot GET /
    });

    app.get('/', function(req, res, next) {
        console.log(obj[obj.length] = "get4-1");
        next(); //route ["use-1","router1-1","router1-2","router2-1","router2-2","get2-1","get2-2","get3-1","get4-1"]
                    //router ["use-1","router1-1","router1-2","router2-1","router2-2","get2-1","get2-2","get3-1","get4-1"]
       res.send(obj); //if you remove .send, router returns 'cannot GET /'
    });

    app.listen(3000,"127.0.0.1");

