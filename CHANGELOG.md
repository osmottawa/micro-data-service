## 0.5.0 - 2016-11-17

- Filter results by intersecting existing OSM data based on attributes

## 0.4.2 - 2016-11-17

- Add 100 concurent HTTP connections
- Improve drasticaly Wikidata lookup (stable)
- `--radius` instead of `--distance`

## 0.3.1 - 2016-11-13

- Fix Wikidata crashing issue
- Add Wikidata automatic tagging

```
?wikidata=true
```

- Add `filter` option, uses the same syntax as [`osm-tag-stats`](https://github.com/mapbox/osm-tag-stats)

```
?filter=[["==","place","town"],["==","@user","jon_snow"]]
```

## 0.2.0 - 2016-11-11

- Switched to Vector Tiles instead of GeoJSON
- Dynamic data loading

## 0.1.0 - 2016-10-01

Project started