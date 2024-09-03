const socket = io(); 


function calculateDistance(latlng1, latlng2) {
    const latlngA = L.latLng(latlng1);
    const latlngB = L.latLng(latlng2);
    return latlngA.distanceTo(latlngB); // Returns distance in meters
}


if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            socket.emit("send-location", { latitude, longitude });
        },
        (error) => {
            console.error(error);
        },
        {
            maximumAge: 0,
            enableHighAccuracy: true,
            timeout: 5000,
        }
    );
}

const map = L.map("map").setView([0, 0], 16 );

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: "trackmyzone"
}).addTo(map);

const markers = {};
const polylines = {};

socket.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;

    // Move the map to the new location
    map.setView([latitude, longitude]);

    // If a marker for the user exists, update its position
    if (markers[id]) {
        const previousLatLng = markers[id].getLatLng();
        markers[id].setLatLng([latitude, longitude]);

        // Update the polyline for the user's movement
        if (polylines[id]) {
            polylines[id].addLatLng([latitude, longitude]);
        } else {
            polylines[id] = L.polyline([previousLatLng, [latitude, longitude]], {
                color: 'yellow',
                weight: 3,
                opacity: 0.7,
                dashArray: '5, 10',
            }).addTo(map);
        }

        // Draw a distance line between the previous and current locations
        const distance = calculateDistance(previousLatLng, [latitude, longitude]);
        L.polyline([previousLatLng, [latitude, longitude]], {
            color: 'yellow',
            weight: 4,
            opacity: 0.6,
            dashArray: '3, 6',
        }).addTo(map);

        // Display distance in popup
        markers[id].bindPopup(`<b>User ID:</b> ${id}<br><b>Coordinates:</b> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br><b>Distance:</b> ${distance.toFixed(2)} meters`).openPopup();
    } else {
        // Create a new marker and polyline if this is the first location update
        markers[id] = L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup(`<b>User ID:</b> ${id}<br><b>Coordinates:</b> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
            .openPopup();

        polylines[id] = L.polyline([[latitude, longitude]], {
            color: 'yellow',
            weight: 3,
            opacity: 0.7,
            dashArray: '5, 10',
        }).addTo(map);
    }
});


socket.on("user-disconnected", (id) => {
    // Remove marker and polyline for the disconnected user
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
    if (polylines[id]) {
        map.removeLayer(polylines[id]);
        delete polylines[id];
    }
});
