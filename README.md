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

**Log into server**

```bash
$ ssh root@data.osmcanada.ca
```

You will be adding the Vector Tiles `.mbtiles` inside the `/data` folder.

**Download new data**

```bash
$ cd micro-data-service/data
$ wget https://raw.githubusercontent.com/osmottawa/imports/master/CSDraveurs/CSD-schools.json
```

**Convert GeoJSON Point to Vector Tile**

```bash
$ tippecanoe \
    --output=ottawa-address.mbtiles \
    --force \
    --base-zoom 0 \
    --no-feature-limit \
    --no-tile-size-limit \
    --minimum-zoom 0 \
    --maximum-zoom 18 \
    --buffer 0 \
    ottawa-address.geojson
```

Restart the server.

```bash
$ docker-compose restart
```

You should now see your new dataset in the JSON.

[https://data.osmcanada.ca/datasets](https://data.osmcanada.ca/datasets)

```json
[
  "cecce-schools",
  "csd-schools",
  "oc-transpo-stops",
  "ocsb-schools",
  "ottawa-buildings"
]
```

**Tasking Manager URL**

https://data.osmcanada.ca/{z}/{x}/{y}/csd-schools.osm

**Import into JOSM URL**

[http://localhost:8111/import?new_layer=true&url=https://data.osmcanada.ca/{z}/{x}/{y}/csd-schools.osm](http://localhost:8111/import?new_layer=true&url=https://data.osmcanada.ca/{z}/{x}/{y}/csd-schools.osm)

**Polygon GeoJSON (Advanced)**

```bash
$ tippecanoe \
    --output=ottawa-buildings-z13.mbtiles \
    --force \
    --minimum-zoom 13 \
    --maximum-zoom 13 \
    --full-detail 19 \
    --no-line-simplification \
    --no-feature-limit \
    --no-tile-size-limit \
    --no-polygon-splitting \
    --no-clipping \
    --no-duplication \
    ottawa-buildings.geojson
```

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
    ottawa-buildings.geojson
```

```bash
$ tippecanoe \
    --output=ottawa-buildings-z15.mbtiles \
    --force \
    --minimum-zoom 15 \
    --maximum-zoom 15 \
    --full-detail 17 \
    --no-line-simplification \
    --no-feature-limit \
    --no-tile-size-limit \
    --no-polygon-splitting \
    --no-clipping \
    --no-duplication \
    ottawa-buildings.geojson
```

Merge SQLite together

```bash
$ sqlite3 ottawa-buildings-z13.mbtiles '.dump' > tmp &&
    sqlite3 ottawa-buildings-z14.mbtiles '.dump' >> tmp &&
    sqlite3 ottawa-buildings-z15.mbtiles '.dump' >> tmp &&
    sqlite3 ottawa-buildings.mbtiles < 'tmp'
```

## Configure Server

Log in to the server.

```bash
$ ssh root@data.osmcanada.ca
$ cd mobile-map-builder/
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
