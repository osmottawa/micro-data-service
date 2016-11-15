#!/bin/sh

# QA-Tiles
# ========
if [ -n "$1" ]; then
    COUNTRY="$1"
else
    echo "[error] Must include country (same name as QA-Tiles)"
    exit 1
fi

# OSM-Tag-Stats
# =============
if [ -n "$2" ]; then
    TAG="$2"
else
    TAG="place"
fi

# Tippecanoe
# ==========
if [ -n "$3" ]; then
    MAX_ZOOM="$3"
else
    MAX_ZOOM=18
fi

# Output Folder
# ============
if [ -n "$4" ]; then
    FOLDER=$4
else
    FOLDER=/tmp
fi
cd $FOLDER

# Download QA-Tile
# ================
if [ ! -f $COUNTRY.mbtiles ]; then
    wget https://s3.amazonaws.com/mapbox/osm-qa-tiles/latest.country/$COUNTRY.mbtiles.gz -O $COUNTRY.mbtiles.gz
    gzip --force --decompress $COUNTRY.mbtiles.gz
fi

# OSM-Tag-Stats
# =============
FILTER="[
    \"all\",
    [\"has\", \"$TAG\"],
    [\"==\", \"@type\", \"node\"]
]"
echo $FILTER > $TAG.json
if [ ! -f $TAG-$COUNTRY.geojson ]; then
    rm -r -f tmp-osm-tag-stats/
    osm-tag-stats \
        --geojson=$TAG-$COUNTRY.geojson \
        --mbtiles=$COUNTRY.mbtiles \
        --filter=$TAG.json
fi

# Remove SQL Dumps
# ================
rm -f $TAG-$COUNTRY.dump

# Tippecanoe
# ==========
for ZOOM in $(seq 0 $MAX_ZOOM); do
    tippecanoe \
        --output=$TAG-$COUNTRY-z$ZOOM.mbtiles \
        --force \
        --minimum-zoom $ZOOM \
        --maximum-zoom $ZOOM \
        --full-detail $((16 - ZOOM + 16)) \
        --no-line-simplification \
        --no-feature-limit \
        --no-tile-size-limit \
        --no-polygon-splitting \
        --no-clipping \
        --no-duplication \
        $TAG-$COUNTRY.geojson

    # SQL Dump
    # ========
    sqlite3 $TAG-$COUNTRY-z$ZOOM.mbtiles '.dump' > $TAG-$COUNTRY.dump
    rm $TAG-$COUNTRY-z$ZOOM.mbtiles
done

# Merge MBTiles
# =============
rm -f $TAG-$COUNTRY.mbtiles
sqlite3 $TAG-$COUNTRY.mbtiles < $TAG-$COUNTRY.dump

# Clean Files
# ===========
rm -f -r tmp-osm-tag-stats/
rm -f $TAG-$COUNTRY.dump
rm -f $COUNTRY.mbtiles.gz

# Upload to AWS
aws s3 cp $TAG-$COUNTRY.mbtiles s3://data.osmcanada.ca/$TAG-$COUNTRY.mbtiles
