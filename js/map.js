var mM = ((settings) => {
    window.MAP = {};
    var endpoint = settings.endpoint || '',
        token = settings.token || '',
        search_profile = settings.search_profile || '',
        route_profile = settings.route_profile || '',
        features = [],
        from,
        to,
        route,
        map,
        loadMap = () => {
            mapboxgl.accessToken = token;
            map = new mapboxgl.Map({
                container: 'map',
                center: [-84.2654823, 9.7214584],
                zoom: 7,
                style: 'mapbox://styles/mapbox/streets-v11'
            });
            map.on('load', () => {
                map.addSource('route', {
                    type: 'geojson',
                    data: turf.featureCollection([])
                });
                map.addLayer({
                    id: 'routes',
                    type: 'line',
                    source: 'route',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': '#3887be',
                        'line-width': [
                            "interpolate", ["linear"],
                            ["zoom"],
                            12, 3,
                            22, 12
                        ]
                    }
                }, 'waterway-label');
                map.addLayer({
                    "id": "symbols",
                    "type": "symbol",
                    "source": "route",
                    "layout": {
                        "symbol-placement": "line",
                        "text-font": ["Open Sans Regular"],
                        "text-field": '{title}',
                        "text-size": 20
                    }
                });
            });
        },
        init = () => {
            loadMap();
            listeners();
        },
        listeners = () => {
            $('#from_search, #to_search').click((e) => {
                let from = $('#from').val();
                let to = $('#to').val();
                let where = e.target.id;
                if (("from_search" === where && "" !== from) || ("to_search" === where && "" !== to)) {
                    let place = "";
                    if ("from_search" === where) {
                        place = from;
                    } else
                    if ("to_search" === where) {
                        place = to;
                    }
                    $.get(encodeURI(endpoint + '/geocoding/v5/' + search_profile + '/' + place + '.json?country=cr&access_token=' + token)).done((response) => {
                        let list = '<ul class="list-group">';
                        if (response.features.length > 0) {
                            features = response.features;
                            $.each(features, (idx, elem) => {
                                list += '<li class="list-group-item"><a class="list-place" href="javascript:void(0);" data-index="' + idx + '" data-where="' + where + '">' + elem.place_name + '</a></li>';
                            });
                        } else {
                            list += '<li class="list-group-item">NO HAY RESULTADOS!!!</li>';
                        }
                        list += '</ul>';
                        $('.modal-body').html(list);
                        $('#myModal').modal('show');
                    });
                }
            });

            $('body').on("click", ".list-place", (e) => {
                $('#myModal').modal('hide');
                let index = $(e.target).attr('data-index');
                let where = $(e.target).attr('data-where');
                if ("from_search" === where) {
                    if (from instanceof mapboxgl.Marker) {
                        from.remove();
                    }
                    from = new mapboxgl.Marker()
                        .setLngLat(features[index].center)
                        .addTo(map);
                    map.flyTo({
                        center: features[index].center,
                        essential: true,
                        zoom: 16,
                    });
                } else if ("to_search" == where) {
                    if (to instanceof mapboxgl.Marker) {
                        to.remove();
                    }
                    to = new mapboxgl.Marker()
                        .setLngLat(features[index].center)
                        .addTo(map);
                }
                if (from instanceof mapboxgl.Marker && to instanceof mapboxgl.Marker) {
                    $.get(encodeURI(endpoint + '/directions/v5/mapbox/' + route_profile + '/' + from._lngLat.lng + ',' + from._lngLat.lat + ';' + to._lngLat.lng + ',' + to._lngLat.lat + '?geometries=geojson&access_token=' + token)).done((response) => {
                        let routeGeoJSON = turf.featureCollection([turf.feature(response.routes[0].geometry)]);
                        window.MAP.distance = (response.routes[0].distance / 1000);
                        window.MAP.duration = (response.routes[0].duration / 60);
                        $('#distance').text(toNumber(window.MAP.distance) + ' Km');
                        $('#duration').text(toNumber(window.MAP.duration) + ' Min.');
                        let coordinates = response.routes[0].geometry.coordinates;
                        let bounds = coordinates.reduce((bounds, coord) => {
                            return bounds.extend(coord);
                        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
                        map.getSource('route')
                            .setData(routeGeoJSON);
                        map.fitBounds(bounds, {
                            padding: 50
                        });
                    });
                }
            });
        },
        toNumber = (v) => {
            return parseFloat(v).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
        }
    init();
});