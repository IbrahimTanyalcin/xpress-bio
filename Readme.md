# <img width=48 height=48 style="vertical-align:middle;" src="./resources/docker/app/src/public/assets/img/xpress-bio-logo.svg"> XPRESS-BIO: lightweight + versatile Bioinformatics framework

[![xpress-bio CI](https://github.com/IbrahimTanyalcin/xpress-bio/actions/workflows/github-workflows.yml/badge.svg)](https://github.com/IbrahimTanyalcin/xpress-bio/actions/workflows/github-workflows.yml)
[![unit-tests](https://img.shields.io/badge/unit-tests-55A860)](https://ibrahimtanyalcin.github.io/sijill/#pipeline%20artifacts/xpress-bio.coverage.js)
[![paper-pdf](https://img.shields.io/badge/paper-pdf-ffd580)](https://ibrahimtanyalcin.github.io/sijill/#papers/JOSS/xpress-bio.joss.pdf.js)


![Xpress-Bio screenshot](https://ibrahimtanyalcin.github.io/sijill/static/img/xpress-bio/gnome.png)

## Motivation

The aim of this package is to reduce development time for webapps deployable via Express.js or Docker. It provides:
- rate-limiting using [`memcached`](./resources/docker/app/js/server/utils/loadMemcachedRoutes.js)
- [`server-sent`](./resources/docker/app/js/server/utils/loadServerSent.js) events out of the box
- `web-sockets` with channels out of the box
- [`session`](./resources/docker/app/js/server/utils/loadSession.js) management
- [threading/`worker`](./resources/docker/app/js/server/workers/feed.js#L1-L20) creation
- [LLM integrations](./resources/docker/README.md#using-with-llms) (Open AI, KongAPI)

To modify server functionality or served content, change the route files inside [`app/js/server/routes`](./resources/docker/app/js/server/routes)

## Disclaimer

Xpress-Bio is **NOT** a public SaaS. Do not expose it directly to the internet without proper authentication and access control.

While it includes basic security measures (csrf, sessions, rate limiting), these are not sufficient for public deployment.

If you need external access, handle authentication through a reverse proxy (e.g. Nginx, Traefik) and route authenticated users to the app.

## Prerequisites

- Debian/Ubuntu
- Node 20 LTS (Should work with >= Node 22, not fully tested. To quickly switch between node versions, you can use `nvm` or `mise` etc.)

> If you’re on HPC, macOS or Windows (without WSL2), use Docker/Singularity.

## One time setup

- Clone the repository
- Navigate into [`resources/docker/app/bin`](./resources/docker/app/bin/)
- Run [`initial-setup.sh`](./resources/docker/app/bin/initial-setup.sh), it will install system dependencies and an interactive menu will ask you what tools to install. Toggle all tools via `space`/`x` key (samtools and blastn) and hit `enter`.
- Navigate into [`resources/docker/app/`](./resources/docker/app/) where `package.json` is located. Run `npm install`.
- You can now run [`resources/docker/app/bin/start.sh`](./resources/docker/app/bin/start.sh) to start the app.

## Getting Files Inside the App
### Using URLs
- Make sure the server hosting the file supports HTTP `HEAD` requests (e.g. Google Cloud, Amazon S3, gist.github.com, etc.).
- In the app, go to **Analyze → Upload**, paste the URL, and click **OK**.

If you provide a link to a `*.tar.gz` or any other compressed file, its contents are automatically unzipped and allocated to the corresponding folders.

### Direct transfer
The app automatically creates the following folders if do not exist:

- `bam/`: BAM files (`.bam`)
- `bai/`: BAM indexes (`.bai`)
- `fa/`: FASTA files (`.fa`, `.fas`, `.fasta`)
- `fai/`: FASTA indexes (`.fai`)
- `bgz/`: BGZIP files created from GFF (`.bgz`)
- `tbi/`: BGZIP index (`.tbi`)
- `csi/`: BGZIP index (`.csi`)
- `gff/`: GFF files (`.gff`)

If the app is **running**, use the `mv` command to atomically perform the operation. If you prefer to use `cp`, stop the app first, copy the files, and then start it again to prevent incomplete indexes.

The app automatically indexes:
- `fasta` → `fai`
- `bam` → `bai`
- `gff` → `bgz`
- `bgz` → `csi` / `tbi`

**Example:**  
If `myfasta.fa` is inside the `fa/` folder but there is no `myfasta.fai` inside `fai/`, it will be created automatically.

## Configuration

You can configure Xpress-Bio by layering `*.config.json` under [`resources/docker/js/server/`](./resources/docker/app/js/server/). Do not modify the default config `server.config.json`, instead layer other `*.config.json` under the same location. These will be alphabetically sorted and then recursively deep merged at runtime (overlapping keys will overwrite each other). To add your keys/bearer tokens for LLMs, refer to the internal readme's [`Using with LLMs`](./resources/docker/README.md#using-with-llms) section.

## Quickstart

From anywhere on your machine, run [`start.sh`](./resources/docker/app/bin/start.sh):

```shell
$ /bin/bash start.sh
```
If you are running from a docker container, do:

```shell
docker run -it --rm -p 3000:3000 --name your-app-name xpress-bio:igv-bam-004
```
Visit `localhost:3000` from your browser.

<small>
⚠️ The shell script will try to start <code>memcached</code> if not started already. Since starting services requires <code>sudo</code>, make sure you execute the commands as <code>sudo</code> if <code>memcached</code> is not running
</small>

<br>

## Documentation

Refer to the internal [`README.md`](./resources/docker/README.md).
