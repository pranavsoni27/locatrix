const socket = io()

let lastPosition = null;

function checkLocationPermission() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function(position) {
            // Location is already enabled
            startLocationTracking();
        },
        function(error) {
            // Location is not enabled, show popup
            showLocationPopup();
        },
        { timeout: 5000 }
    );
}

function showLocationPopup() {
    const popup = document.createElement('div');
    popup.className = 'location-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h3>Enable Location Access</h3>
            <p>Please enable location services to see your live location on the map.</p>
            <button id="enableLocation" class="enable-button">
                <i class="fas fa-location-arrow"></i>
                Turn On Location
            </button>
            <div class="instructions">
                <p>If the button doesn't work:</p>
                <ol>
                    <li>Click the location icon in your browser's address bar</li>
                    <li>Select "Allow" when prompted</li>
                    <li>Make sure your device's location is turned on</li>
                </ol>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById('enableLocation').addEventListener('click', function() {
        requestLocationPermission();
    });
}

function requestLocationPermission() {
    navigator.permissions.query({ name: 'geolocation' }).then(function(permissionStatus) {
        permissionStatus.onchange = function() {
            if (this.state === 'granted') {
                const popup = document.querySelector('.location-popup');
                if (popup) popup.remove();
                startLocationTracking();
            }
        };

        navigator.geolocation.getCurrentPosition(
            function(position) {
                // Successfully got location
                const popup = document.querySelector('.location-popup');
                if (popup) popup.remove();
                startLocationTracking();
                map.setView([position.coords.latitude, position.coords.longitude], 16);
            },
            function(error) {
                if (error.code === error.PERMISSION_DENIED) {
                    showLocationError("Please allow location access in your browser settings");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

function showLocationError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'location-error';
    errorDiv.innerHTML = `
        <div class="error-content">
            <p>${message}</p>
            <button onclick="requestLocationPermission()" class="btn btn-primary">Try Again</button>
        </div>
    `;
    document.body.appendChild(errorDiv);
}

function startLocationTracking() {
    if(navigator.geolocation){
        navigator.geolocation.watchPosition(
            (position) => {
                const {latitude, longitude} = position.coords;
                socket.emit("send-location", {latitude, longitude});
                lastPosition = position;
                
                if (!markers[socket.id]) {
                    map.setView([latitude, longitude], 16);
                }
            }, 
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    showLocationPopup();
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0  
            }
        );
    }
}

function shareLocation() {
    if (!lastPosition) {
        alert('Location not available yet');
        return;
    }

    const locationUrl = `https://www.google.com/maps?q=${lastPosition.coords.latitude},${lastPosition.coords.longitude}`;

    if (navigator.share) {
        navigator.share({
            title: 'My Location',
            text: 'Check my location!',
            url: locationUrl
        }).catch(() => {
            showShareModal(locationUrl);
        });
    } else {
        showShareModal(locationUrl);
    }
}

function showShareModal(locationUrl) {
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-content">
            <h3>Share Location</h3>
            <div class="share-buttons">
                <button onclick="copyToClipboard('${locationUrl}')" class="share-button">
                    <i class="fas fa-copy"></i>
                    <span>Copy Link</span>
                </button>
                <button onclick="shareViaWhatsApp('${locationUrl}')" class="share-button whatsapp">
                    <i class="fab fa-whatsapp"></i>
                    <span>WhatsApp</span>
                </button>
                <button onclick="shareViaEmail('${locationUrl}')" class="share-button email">
                    <i class="fas fa-envelope"></i>
                    <span>Email</span>
                </button>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="close-button">
                Close
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function copyToClipboard(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('Location link copied!');
        document.querySelector('.share-modal').remove();
    }).catch(() => {
        alert('Failed to copy link');
    });
}

function shareViaWhatsApp(url) {
    const text = encodeURIComponent(`Check my location!\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareViaEmail(url) {
    const subject = encodeURIComponent('My Location');
    const body = encodeURIComponent(`Check my location!\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const map = L.map("map").setView([0, 0], 16)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "Locatrix"
}).addTo(map)

const markers = {}

socket.on("receive-location", (data)=>{
        const {id, latitude, longitude} = data;
        // map.setView([latitude, longitude]);

        // 
        if (id === socket.id && !markers[id]) {
                map.setView([latitude, longitude], 16);
        }

        if(markers[id]){
                markers[id].setLatLng([latitude, longitude]);
        }else{
                markers[id] = L.marker([latitude, longitude]).addTo(map);

                // 
                markers[id].bindPopup(`You`).openPopup();
        }
})

socket.on("user-disconnected", (id)=>{
        if(markers[id]){
                map.removeLayer(markers[id])
                delete markers[id];
        }
})

document.addEventListener('DOMContentLoaded', function() {
    checkLocationPermission();
    
    document.getElementById('centerLocation').addEventListener('click', () => {
        if (lastPosition) {
            map.setView([lastPosition.coords.latitude, lastPosition.coords.longitude], 16);
        }
    });

    document.getElementById('shareLocation').addEventListener('click', shareLocation);
});