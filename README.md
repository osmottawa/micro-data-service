# Micro Data Service

Hosts vector tiles to be used in conjuction with the OSM Tasking Manager.

## Install

```bash
$ npm install
```

## Quickstart

```bash
$ npm start
```

## Create Vector tiles

Using [`tippecanoe`](https://github.com/mapbox/tippecanoe) you can generate Vector Tiles based on your GeoJSON.

```bash
$ tippecanoe \
    --output=ottawa-buildings.mbtiles \
    --force \
    --full-detail \
    --read-parallel \
    --layer data \
    --maximum-zoom 12 \
    --minimum-zoom 12 \
    --base-zoom 12 \
    buildings.json
```

## Configure Server

Log in to the server.

```bash
$ ssh root@addxy.com
$ cd mobile-map-builder/
```

Update `datasets` configuraiton to add or update any new data by adding a URL.

```bash
$ nano configs/datasets.yml
```

Restart Server using `docker-compose`

```bash
$ docker-compose restart
Restarting mmb ... done
```

Stop & Start the server

```bash
$ docker-compse stop
Stopping mmb ... done
```
```bash
$ docker-compose start
Starting web ... done
```

Check if service is running

```bash
$ docker ps

CONTAINER ID        IMAGE                  COMMAND             CREATED             STATUS              PORTS                    NAMES
4366f14bf554        mobilemapbuilder_web   "npm start"         19 hours ago        Up 21 seconds       0.0.0.0:5000->5000/tcp   mmb
```

Check logs

```bash
$ docker-compose logs
```