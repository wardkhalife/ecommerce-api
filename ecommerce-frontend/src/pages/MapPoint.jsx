import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";

export default function MapPoint() {
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Exemple de points relais (remplace par API réelle ensuite)
  const relayPoints = [
    { id: 1, name: "Point Relais 1", lat: 48.8566, lng: 2.3522 },
    { id: 2, name: "Point Relais 2", lat: 48.8666, lng: 2.3422 },
  ];

  return (
    <div style={{ height: "90vh", width: "100%" }}>
      <h2>Choisissez votre point relais</h2>

      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={13}
        style={{ height: "80vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {relayPoints.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            eventHandlers={{
              click: () => setSelectedPoint(p),
            }}
          >
            <Popup>{p.name}</Popup>
          </Marker>
        ))}
      </MapContainer>

      {selectedPoint && (
        <div style={{ marginTop: "10px", padding: "10px", background: "#eee" }}>
          <h3>Point choisi :</h3>
          <p>{selectedPoint.name}</p>

          <button
            onClick={() => {
              localStorage.setItem("relayPoint", JSON.stringify(selectedPoint));
              alert("Point relais enregistré !");
            }}
          >
            Confirmer ce point relais
          </button>
        </div>
      )}
    </div>
  );
}
