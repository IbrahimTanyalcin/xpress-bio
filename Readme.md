# XPRESS-BIO: lightweight + versatile Bioinformatics framework

![app-upload-progress](./resources/docker/app/src/public/assets/img/app-upload-progress.PNG)

## Motivation

The aim of this package is to cut development time of webapps that can be deployed directly or via docker using express.js. It provides:
- rate-limiting using [`memcached`](./resources/docker/app/js/server/utils/loadMemcachedRoutes.js)
- configurable [`csrf`](./resources/docker/app/js/server/utils/loadCSRFClientSideRoutes.js) protection
- [`server-sent`](./resources/docker/app/js/server/utils/loadServerSent.js) events out of the box
- [`session`](./resources/docker/app/js/server/utils/loadSession.js) management
- [threading/`worker`](./resources/docker/app/js/server/workers/feed.js#L1-L20) creation

To modify server functionality or served content, change the route files inside [`app/js/server/routes`](./resources/docker/app/js/server/routes)

## Quickstart

From anywhere in your machine, run [`start.sh`](./resources/docker/app/bin/start.sh):

```shell
$ /bin/bash start.sh
```
If you are running from a docker container, do:

```shell
docker run -it --rm --name your-app-name -p 3000:3000 xpress-bio:igv-bam-004
```
Visit `localhost:3000` from your browser.

<small>
⚠️ The shell script will try to start <code>memcached</code> if not started already. Since starting services requires <code>sudo</code>, make sure you execute the commands as <code>sudo</code> if <code>memcached</code> is not running
</small>

<br>

## Documentation

Refer to the internal [`README.md`](./resources/docker/README.md).
