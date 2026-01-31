'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin, Box, ArrowRight, Focus } from 'lucide-react';

// Create custom icons using Lucide React
const createCustomIcon = (type = 'default', color = '#3b82f6') => {
    let iconMarkup;

    if (type === 'hub') {
        iconMarkup = (
            <div className="relative flex items-center justify-center w-8 h-8">
                <div className="absolute w-full h-full bg-blue-500/20 rounded-full animate-ping"></div>
                <div className="relative w-8 h-8 bg-slate-900 border-2 border-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Box className="w-4 h-4 text-blue-400" />
                </div>
                <div className="absolute -bottom-1 w-2 h-2 bg-blue-500 rotate-45"></div>
            </div>
        );
    } else {
        iconMarkup = (
            <div className="relative flex items-center justify-center w-6 h-6">
                <div className="relative w-6 h-6 bg-slate-900 border-2 border-slate-500 rounded-full flex items-center justify-center shadow-lg">
                    <MapPin className="w-3 h-3 text-slate-300" />
                </div>
            </div>
        );
    }

    return L.divIcon({
        html: renderToStaticMarkup(iconMarkup),
        className: 'custom-marker-icon bg-transparent', // Important: bg-transparent to remove default square
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};


function ChangeView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

// Helper to generate a Quadratic Bezier Curve
const getCurvedPath = (start, end, curvature = 0.2, points = 100) => {
    const [lat1, lng1] = start;
    const [lat2, lng2] = end;

    // Calculate distance to adjust curvature (optional scales nicely)
    const distLat = lat2 - lat1;
    const distLng = lng2 - lng1;

    // Midpoint
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    // Control Point: Offset perpendicular to the line
    // Perpendicular vector (-dy, dx)
    // We scale it by distance for consistent look
    const controlLat = midLat - distLng * curvature;
    const controlLng = midLng + distLat * curvature;

    const path = [];

    for (let i = 0; i <= points; i++) {
        const t = i / points;
        // B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        const l_lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * controlLat + t * t * lat2;
        const l_lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * controlLng + t * t * lng2;
        path.push([l_lat, l_lng]);
    }
    return path;
};

// Recenter Control Component
const RecenterControl = ({ routeCoordinates, allSegments }) => {
    const map = useMap();

    const handleRecenter = (e) => {
        e.stopPropagation(); // Prevent map click
        let bounds = [];

        if (routeCoordinates && routeCoordinates.length > 0) {
            // Fit to Selected Route
            bounds = routeCoordinates.map(pt => [pt.lat, pt.lng]);
        } else if (allSegments && allSegments.length > 0) {
            // Fit to Whole Graph
            bounds = allSegments.flatMap(s => [s.from, s.to]);
        } else {
            // Default View - Animate
            map.flyTo([24.7136, 46.6753], 5, { duration: 1.5 });
            return;
        }

        if (bounds.length > 0) {
            // Animate to Bounds
            map.flyToBounds(bounds, {
                padding: [50, 50],
                duration: 1.5,
                easeLinearity: 0.25
            });
        }
    };

    return (
        <div className="leaflet-bottom leaflet-right">
            <div className="leaflet-control leaflet-bar">
                <button
                    onClick={handleRecenter}
                    className="flex items-center justify-center w-10 h-10 bg-slate-900 border border-slate-600 text-white hover:bg-slate-800 transition-colors shadow-2xl rounded-lg mb-6 mr-6 pointer-events-auto cursor-pointer"
                    title="Recenter Map"
                    style={{ pointerEvents: 'auto' }} // Ensure clicks work
                >
                    <Focus className="w-5 h-5 text-blue-400" />
                </button>
            </div>
        </div>
    );
};

const MapVisualizer = ({ routeCoordinates, routeSegments, allSegments }) => {
    // Determine Center and Zoom
    // If route is selected, focus on it.
    // If NOT selected, show whole map (default center or calculated center of all nodes)
    const hasRoute = routeCoordinates && routeCoordinates.length > 0;

    // Default Riyadh Center
    const defaultCenter = [24.7136, 46.6753];

    const center = hasRoute ? routeCoordinates[0] : defaultCenter;
    const zoom = hasRoute ? 6 : 5;

    return (
        <div className="h-screen w-full relative bg-slate-950">
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', background: '#020617' }}
                className="z-0"
                minZoom={3}
                maxBounds={[[-90, -180], [90, 180]]}
                maxBoundsViscosity={1.0}
            >
                <ChangeView center={center} zoom={zoom} />
                <RecenterControl routeCoordinates={routeCoordinates} allSegments={allSegments} />

                {/* Dark Matter Tiles for Premium Look */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    noWrap={true}
                />

                {/* Background Network (All Connections) */}
                {allSegments && allSegments.map((seg, idx) => (
                    <Polyline
                        key={`bg-${idx}`}
                        positions={getCurvedPath(seg.from, seg.to, 0.2)}
                        pathOptions={{
                            color: '#475569', // Slate-600 for better visibility
                            weight: 1.5,
                            opacity: 0.5,
                            lineCap: 'round'
                        }}
                        interactive={false} // Non-interactive background
                    />
                ))}

                {/* Selected Route Segments (highlighted) */}
                {routeSegments && routeSegments.map((seg, idx) => (

                    <Polyline
                        key={idx}
                        positions={getCurvedPath(seg.from, seg.to, 0.2)} // Apply curve
                        pathOptions={{
                            color: seg.color || '#3b82f6',
                            weight: seg.weight || 3,
                            opacity: 0.8,
                            dashArray: seg.isDelay ? '4, 8' : null,
                            lineCap: 'round'
                        }}
                    >
                        <Tooltip sticky className="custom-tooltip shadow-xl border-0 !bg-slate-800 !text-white rounded-lg px-3 py-2">
                            <div className="text-xs">
                                <p className="font-bold mb-1 text-slate-300">{seg.label}</p>
                                <p>Duration: <span className="text-white">{seg.duration.toFixed(2)}h</span></p>
                                {seg.banDelay > 0 && (
                                    <p className="text-red-400 font-bold mt-1">Delay: +{seg.banDelay.toFixed(2)}h</p>
                                )}
                            </div>
                        </Tooltip>
                    </Polyline>
                ))}

                {/* Nodes */}
                {routeCoordinates && routeCoordinates.map((pt, idx) => (
                    <Marker
                        key={idx}
                        position={[pt.lat, pt.lng]}
                        icon={createCustomIcon(idx === 0 || idx === routeCoordinates.length - 1 ? 'hub' : 'node')}
                    >
                        <Popup className="custom-popup" closeButton={false}>
                            <div className="p-3 min-w-[200px] bg-slate-900 text-white rounded-lg border border-slate-700 shadow-2xl">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
                                    <h3 className="font-bold text-sm text-blue-400">{pt.name}</h3>
                                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{pt.code}</span>
                                </div>
                                <div className="space-y-1 text-xs text-slate-400 font-mono">
                                    <p>LAT: {pt.lat}</p>
                                    <p>LNG: {pt.lng}</p>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

            </MapContainer>


        </div>
    );
};

export default MapVisualizer;
