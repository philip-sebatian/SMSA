import Papa from 'papaparse';

// Fallback for unknown
const DEFAULT_COORD = { lat: 24.7136, lng: 46.6753, name: 'Unknown Location' };

export const loadData = async () => {
    const parseCSV = (url) => new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
        });
    });

    try {
        const [pathRaw, legRaw, coordsRaw] = await Promise.all([
            parseCSV('/data/path_data.csv?v=' + Date.now()),
            parseCSV('/data/leg_data.csv?v=' + Date.now()),
            parseCSV('/data/smsa - Location Cord.csv?v=' + Date.now())
        ]);

        // Create a map of Leg Data
        const legMap = new Map();
        legRaw.forEach(row => {
            const key = `${row.leg_origin}_${row.leg_destination}_${row.leg_origin_cpt}`;
            legMap.set(key, row);
        });

        // Create a map of Coordinates
        const coordMap = new Map();
        coordsRaw.forEach(row => {
            if (row.Name && row.Latitude && row.Longitude) {
                coordMap.set(row.Name, {
                    lat: row.Latitude,
                    lng: row.Longitude,
                    name: row.Name
                });
            }
        });

        const getCoords = (code) => {
            return coordMap.get(code) || { ...DEFAULT_COORD, name: code };
        };

        const processedPaths = pathRaw.filter(p => p.id).map(pathRow => {
            const legKey = `${pathRow.leg_origin}_${pathRow.leg_destination}_${pathRow.leg_origin_cpt}`;
            const legInfo = legMap.get(legKey) || {};

            const originCoords = getCoords(pathRow.leg_origin);
            const destCoords = getCoords(pathRow.leg_destination);

            // Dates
            const startDt = new Date(pathRow.leg_origin_cpt);
            const endDt = new Date(pathRow.leg_cit);

            const actualDuration = (endDt - startDt) / (1000 * 3600);
            const idealDuration = legInfo['Travel Time'] || 0;
            const delay = Math.max(0, actualDuration - idealDuration);

            // In app.py, is_heavy comes from merged leg data
            const isHeavy = (legInfo.num_Truck > 0) || (legInfo.num_Trailer > 0);
            const banDelay = (isHeavy && idealDuration > 0) ? delay : 0;

            // Sequence / Sorting Logic
            const isSorting = (pathRow.sequence_id % 1) !== 0;

            // Cost Calculation
            const totalLegVol = legInfo.total_pallet_count || legInfo.leg_total_vol || 1;
            const vShare = (pathRow.total_pallet_count || 0) / totalLegVol;
            const legTotalCost = legInfo['Total Cost'] || 0;
            const costShare = vShare * legTotalCost;

            // Vehicles
            const vehicles = [];
            if (legInfo.num_HiRoof > 0) vehicles.push(`${legInfo.num_HiRoof} HiRoof`);
            if (legInfo.num_Truck > 0) vehicles.push(`${legInfo.num_Truck} Truck`);
            if (legInfo.num_Trailer > 0) vehicles.push(`${legInfo.num_Trailer} Trailer`);

            return {
                ...pathRow,
                legInfo,
                originCoords,
                destCoords,
                delay,
                banDelay,
                actualDuration,
                isSorting,
                costShare,
                vShare,
                vehicles: vehicles.join(', '),
                startDt,
                endDt
            };
        });

        return processedPaths;

    } catch (error) {
        console.error("Error loading data:", error);
        return [];
    }
};
