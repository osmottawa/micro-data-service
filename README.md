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

**Point GeoJSON**

```bash
$ tippecanoe \
    --output=oc-transpo-stops.mbtiles \
    --force \
    --base-zoom 12 \
    --no-feature-limit \
    --no-tile-size-limit \
    --minimum-zoom 12 \
    --maximum-zoom 15 \
     oc-transpo-stops.geojson
```

**Polygon GeoJSON**

```bash
$ tippecanoe \
    --output=ottawa-buildings-z14.mbtiles \
    --force \
    --minimum-zoom 14 \
    --maximum-zoom 14 \
    --full-detail 18 \
    --no-line-simplification \
    --no-feature-limit \
    --no-tile-size-limit \
    --no-polygon-splitting \
    --no-clipping \
    --no-duplication \
    buildings.geojson
```

Merge SQLite together

```bash
$ sqlite3 ottawa-buildings-z13.mbtiles '.dump' >> tmp
$ sqlite3 ottawa-buildings-z14.mbtiles '.dump' >> tmp
$ sqlite3 ottawa-buildings.mbtiles < 'tmp'
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