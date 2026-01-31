'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '../components/Sidebar';
import { loadData } from '../utils/dataProcessor';

const MapVisualizer = dynamic(() => import('../components/MapVisualizer'), {
    ssr: false,
    loading: () => <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-slate-500 font-mono text-sm tracking-widest">INITIALIZING SATELLITE VIEW...</div>
});

export default function Home() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedOrigin, setSelectedOrigin] = useState('');
    const [selectedDest, setSelectedDest] = useState('');

    useEffect(() => {
        loadData().then(loadedData => {
            setData(loadedData);
            setLoading(false);
        });
    }, []);

    const origins = useMemo(() => {
        return [...new Set(data.map(d => d.path_origin))].sort();
    }, [data]);

    const destinations = useMemo(() => {
        if (!selectedOrigin) return [];
        return [...new Set(
            data.filter(d => d.path_origin === selectedOrigin).map(d => d.path_destination)
        )].sort();
    }, [data, selectedOrigin]);

    const routeData = useMemo(() => {
        if (!selectedOrigin || !selectedDest) return null;

        const filtered = data.filter(
            d => d.path_origin === selectedOrigin && d.path_destination === selectedDest
        );

        if (filtered.length === 0) return null;
        const pathId = filtered[0].id;
        const thisPath = filtered
            .filter(d => d.id === pathId)
            .sort((a, b) => a.sequence_id - b.sequence_id);

        const nodes = [];
        const segments = [];
        let accumulatedBanDelay = 0;
        let accumulatedCost = 0;

        if (thisPath.length > 0) {
            const first = thisPath[0];
            nodes.push({ ...first.originCoords, code: first.leg_origin });
        }

        thisPath.forEach(leg => {
            // Check for overlap with existing nodes
            let lat = leg.destCoords.lat;
            let lng = leg.destCoords.lng;

            // If overlapping with ANY previous node, shift slightly
            // Simple approach: shift up slightly if duplicate
            const isOverlap = nodes.some(n => Math.abs(n.lat - lat) < 0.0001 && Math.abs(n.lng - lng) < 0.0001);
            if (isOverlap) {
                lat += 0.05; // ~5km offset roughly, visibly distinct
            }

            nodes.push({ lat, lng, name: leg.destCoords.name, code: leg.leg_destination });

            // Also need to use these potentially OFFSET coordinates for the segment destination
            // But we want the line to go to the OFFSET location so it points to the marker
            const originNode = nodes[nodes.length - 2]; // Previous node (origin of this leg)
            const destNode = nodes[nodes.length - 1];   // Current node (dest of this leg)

            accumulatedBanDelay += (leg.banDelay || 0);
            accumulatedCost += (leg.costShare || 0);

            segments.push({
                from: [originNode.lat, originNode.lng], // Use potentially offsetted coords
                to: [destNode.lat, destNode.lng],

                color: leg.banDelay > 0 ? '#ef4444' : '#3b82f6',
                isDelay: leg.banDelay > 0,
                banDelay: leg.banDelay || 0,
                duration: leg.actualDuration || 0,
                label: `${leg.leg_origin} -> ${leg.leg_destination}`,
                // NEW FIELDS FOR SIDEBAR
                costShare: leg.costShare || 0,
                vehicles: leg.vehicles,
                startDt: leg.startDt,
                endDt: leg.endDt,
                isSorting: leg.isSorting,
                // Keys for Shared Volume Lookup
                leg_origin: leg.leg_origin,
                leg_destination: leg.leg_destination,
                leg_origin_cpt: leg.leg_origin_cpt
            });
        });

        const metrics = {
            totalDuration: (new Date(thisPath[thisPath.length - 1].destination_cit) - new Date(thisPath[0].origin_cpt)) / (1000 * 3600),
            totalBanDelay: accumulatedBanDelay,
            totalCostShare: accumulatedCost,
            volume: thisPath[0].total_pallet_count,
            pathType: thisPath[0].pathtype
        };

        return { nodes, segments, metrics };

    }, [data, selectedOrigin, selectedDest]);

    const allSegments = useMemo(() => {
        if (!data.length) return [];
        const unique = new Map();
        data.forEach(d => {
            if (d.leg_origin && d.leg_destination && d.originCoords && d.destCoords) {
                const key = `${d.leg_origin}-${d.leg_destination}`;
                if (!unique.has(key)) {
                    unique.set(key, {
                        from: [d.originCoords.lat, d.originCoords.lng],
                        to: [d.destCoords.lat, d.destCoords.lng],
                        color: '#475569', // Slate-600 for visibility
                        weight: 1.5,
                        opacity: 0.5,
                        label: `${d.leg_origin} -> ${d.leg_destination}`
                    });
                }
            }
        });
        return Array.from(unique.values());
    }, [data]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white flex-col gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-mono text-sm tracking-widest text-blue-400">LOADING SYSTEM DATA...</p>
            </div>
        );
    }

    return (
        <main className="flex min-h-screen w-full bg-slate-950 overflow-hidden relative">
            <Sidebar
                origins={origins}
                destinations={destinations}
                selectedOrigin={selectedOrigin}
                selectedDest={selectedDest}
                onOriginChange={(val) => { setSelectedOrigin(val); setSelectedDest(''); }}
                onDestChange={setSelectedDest}
                metrics={routeData?.metrics}
                segments={routeData?.segments} // PASSING SEGMENTS
                allPaths={data} // PASSING FULL DATA FOR LOOKUP
            />

            <div className="flex-1 w-full h-screen pl-0 md:pl-96 transition-[padding] duration-300">
                <MapVisualizer
                    routeCoordinates={routeData?.nodes}
                    routeSegments={routeData?.segments}
                    allSegments={allSegments}
                />
            </div>
        </main>
    );
}
