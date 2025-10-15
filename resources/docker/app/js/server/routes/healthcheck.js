module.exports = async function({express, app, info, files, serverSent, ws, memcache: cache}){
    app.get('/healthcheck', function (req, res, next) {
        res.status(200).end();
    });
}