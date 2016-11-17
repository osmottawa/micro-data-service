#!/bin/bash

while getopts ":c:t:z:f:h" opt; do
	case $opt in
		h)
			echo "-c	Specify country" >&2
			echo >&2
			echo "-t	Specify the tag to filter. Default: place" >&2
			echo >&2
			echo "-z	Specify the maximum zoom for tippecanoe" >&2
			echo >&2
			echo "-f	Specify the output folder" >&2
			echo >&2
			echo "-h	Prints this help file" >&2
			exit 0
			;;
		\?)
			echo "Invalid option: -$OPTARG" >&2
			exit 1
			;;
		:)
			echo "Option -$OPTARG requires an argument." >&2
			exit 1
			;;
		c)
			COUNTRY=$OPTARG
			;;
		t)
			TAG=$OPTARG
			;;
		z)
			MAX_ZOOM=$OPTARG
			;;
		f)
			FOLDER=$OPTARG
			;;		
	esac
done
if [ -z ${FOLDER+x} ]; then	FOLDER="/root/micro-data-service/data"; fi
if [ -z ${TAG+x} ]; then TAG="place"; fi
if [ -z ${MAX_ZOOM+x} ]; then MAX_ZOOM=18; fi

# Download QA-Tile
# ================
if [ ! -f $COUNTRY.mbtiles ]; then
    BASE=https://s3.amazonaws.com/mapbox/osm-qa-tiles/latest
    if [ "$COUNTRY" = "planet" ]; then
        URL=$BASE.planet.mbtiles.gz
    else
        URL=$BASE.country/$COUNTRY.mbtiles.gz
    fi
    wget $URL -O $COUNTRY.mbtiles.gz
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
    sqlite3 $TAG-$COUNTRY-z$ZOOM.mbtiles '.dump' >> $TAG-$COUNTRY.dump
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
# =============
aws s3 cp $TAG-$COUNTRY.mbtiles s3://data.osmcanada.ca/$TAG-$COUNTRY.mbtiles
aws s3 cp $TAG-$COUNTRY.geojson s3://data.osmcanada.ca/$TAG-$COUNTRY.geojson

# Copy to Folder
# ==============
cp /tmp/$TAG-$COUNTRY.mbtiles $FOLDER/$TAG-$COUNTRY.mbtiles
