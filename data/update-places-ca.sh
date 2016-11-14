SOURCE=places-ca

# Download
wget https://s3.amazonaws.com/mapbox/osm-qa-tiles/latest.country/canada.mbtiles.gz

# Unzip
gzip -d canada.mbtiles.gz

# Filter only @types=nodes place=*
osm-tag-stats --geojson=$SOURCE.geojson --mbtiles='canada.mbtiles' --filter='./filter/places.json'

# Create Vector tile Zoom 0-18
tippecanoe \
    --output=tmp.mbtiles \
    --force \
    --base-zoom 0 \
    --no-feature-limit \
    --no-tile-size-limit \
    --minimum-zoom 0 \
    --maximum-zoom 18 \
    --buffer 0 \
    $SOURCE.geojson

# Overwrite existing
mv tmp.mbtiles $SOURCE.mbtiles

# Restart server
docker-compose restart
