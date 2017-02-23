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
$ ssh ubuntu@data.osmcanada.com
```

You will be adding the Vector Tiles `.mbtiles` inside the `/data` folder.

**Download new data**

```bash
$ cd micro-data-service/data
$ wget https://raw.githubusercontent.com/osmottawa/imports/master/CSDraveurs/CSD-schools.json
```

### Convert GeoJSON Point to Vector Tile

```bash
SOURCE=ottawa-address

# Zoom 0 to 18
tippecanoe \
    --output=$SOURCE.mbtiles \
    --force \
    --base-zoom 0 \
    --no-feature-limit \
    --no-tile-size-limit \
    --minimum-zoom 0 \
    --maximum-zoom 18 \
    --buffer 0 \
    $SOURCE.geojson
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

### Polygon GeoJSON (Advanced)

```bash
SOURCE=halifax-buildings

# Zoom 12
tippecanoe \
    --output=$SOURCE-z12.mbtiles \
    --force \
    --minimum-zoom 12 \
    --maximum-zoom 12 \
    --full-detail 20 \
    --no-line-simplification \
    --no-feature-limit \
    --no-tile-size-limit \
    --no-polygon-splitting \
    --no-clipping \
    --no-duplication \
    $SOURCE.geojson

# Zoom 13
tippecanoe \
    --output=$SOURCE-z13.mbtiles \
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
    $SOURCE.geojson

# Zoom 14
tippecanoe \
    --output=$SOURCE-z14.mbtiles \
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
    $SOURCE.geojson

# Zoom 15
tippecanoe \
    --output=$SOURCE-z15.mbtiles \
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
    $SOURCE.geojson

# Zoom 16
tippecanoe \
    --output=$SOURCE-z16.mbtiles \
    --force \
    --minimum-zoom 16 \
    --maximum-zoom 16 \
    --full-detail 16 \
    --no-line-simplification \
    --no-feature-limit \
    --no-tile-size-limit \
    --no-polygon-splitting \
    --no-clipping \
    --no-duplication \
    $SOURCE.geojson

# Zoom 17
tippecanoe \
    --output=$SOURCE-z17.mbtiles \
    --force \
    --minimum-zoom 17 \
    --maximum-zoom 17 \
    --full-detail 15 \
    --no-line-simplification \
    --no-feature-limit \
    --no-tile-size-limit \
    --no-polygon-splitting \
    --no-clipping \
    --no-duplication \
    $SOURCE.geojson

# Merge SQLite together
sqlite3 $SOURCE-z13.mbtiles '.dump' > tmp &&
    sqlite3 $SOURCE-z12.mbtiles '.dump' > tmp &&
    sqlite3 $SOURCE-z14.mbtiles '.dump' >> tmp &&
    sqlite3 $SOURCE-z15.mbtiles '.dump' >> tmp &&
    sqlite3 $SOURCE-z16.mbtiles '.dump' >> tmp &&
    sqlite3 $SOURCE-z17.mbtiles '.dump' >> tmp &&
    sqlite3 $SOURCE.mbtiles < 'tmp'
rm $SOURCE-z12.mbtiles $SOURCE-z13.mbtiles $SOURCE-z14.mbtiles $SOURCE-z15.mbtiles $SOURCE-z16.mbtiles $SOURCE-z17.mbtiles tmp
```

## Configure Server

Log in to the server.

```bash
$ ssh root@data.osmcanada.ca
$ cd micro-data-service/
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
