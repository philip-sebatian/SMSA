import React, { useState } from 'react';
import { Box, MapPin, Clock, AlertTriangle, Truck, Layers, ArrowDown, DollarSign, Eye, X } from 'lucide-react';

const Sidebar = ({
    origins,
    destinations,
    selectedOrigin,
    selectedDest,
    onOriginChange,
    onDestChange,
    metrics,
    segments,
    allPaths // Full data for lookup
}) => {
    const [sharedVolData, setSharedVolData] = useState(null);

    const handleShowShared = (seg) => {
        if (!allPaths) return;
        // Filter: same leg origin, dest, and start time
        const shared = allPaths.filter(p =>
            p.leg_origin === seg.leg_origin &&
            p.leg_destination === seg.leg_destination &&
            p.leg_origin_cpt === seg.leg_origin_cpt
        );
        setSharedVolData({
            title: `${seg.leg_origin} -> ${seg.leg_destination}`,
            items: shared
        });
    };

    return (
        <>
            <div className="w-96 h-screen fixed left-0 top-0 z-[1000] flex flex-col border-r border-white/10 bg-slate-950/90 backdrop-blur-xl text-slate-100 font-sans shadow-2xl">

                {/* Header */}
                <div className="p-5 border-b border-white/5 bg-slate-900/50 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <Layers className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight text-white leading-tight">QuantyF</h1>
                            <p className="text-[10px] text-slate-400 font-medium">Network Intelligence</p>
                        </div>
                    </div>

                    {/* Compact Selection */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-blue-500/50 focus:outline-none hover:bg-slate-800"
                                value={selectedOrigin}
                                onChange={(e) => onOriginChange(e.target.value)}
                            >
                                <option value="">Origin</option>
                                {origins.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-blue-500/50 focus:outline-none hover:bg-slate-800 disabled:opacity-50"
                                value={selectedDest}
                                onChange={(e) => onDestChange(e.target.value)}
                                disabled={!selectedOrigin}
                            >
                                <option value="">Dest</option>
                                {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {metrics && (
                        <div className="p-5 space-y-6">

                            {/* Top Metrics Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Time</p>
                                    <p className="text-xl font-bold text-white">{metrics.totalDuration.toFixed(2)}<span className="text-xs text-slate-500">h</span></p>
                                </div>
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Cost</p>
                                    <p className="text-xl font-bold text-emerald-400">${metrics.totalCostShare?.toFixed(2) || '0.00'}</p>
                                </div>
                                <div className="col-span-2 bg-slate-900/50 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Delay</p>
                                        <p className={`text-lg font-bold ${metrics.totalBanDelay > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                                            {metrics.totalBanDelay.toFixed(2)}h
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Volume</p>
                                        <p className="text-lg font-bold text-white">{metrics.volume.toFixed(4)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline / Detailed Breakdown */}
                            <div>
                                <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-widest pl-1 border-l-2 border-blue-500 pl-2">Journey Timeline</h3>

                                <div className="space-y-0 relative border-l border-slate-800 ml-2">
                                    {segments && segments.map((seg, idx) => (
                                        <div key={idx} className="mb-6 ml-6 relative group">
                                            {/* Dot */}
                                            <div className={`absolute -left-[31px] top-0 w-3 h-3 rounded-full border-2 ${seg.isDelay ? 'bg-red-500 border-red-900' : 'bg-blue-500 border-blue-900'} shadow-sm`}></div>

                                            {/* Card */}
                                            <div className="bg-slate-900/40 border border-white/5 rounded-lg p-3 hover:bg-slate-900/80 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-blue-300">{seg.label}</span>
                                                    <div className="flex items-center gap-2">
                                                        {seg.isSorting ? (
                                                            <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">SORT</span>
                                                        ) : (
                                                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">LEG</span>
                                                        )}
                                                        {/* View Shared Vol Button */}
                                                        <button
                                                            onClick={() => handleShowShared(seg)}
                                                            className="text-slate-400 hover:text-white transition-colors" title="View Shared Volumes"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] text-slate-400 mb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{new Date(seg.startDt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <ArrowDown className="w-2 h-2 rotate-[-90deg]" />
                                                        <span>{new Date(seg.endDt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-emerald-400/80">
                                                        <DollarSign className="w-3 h-3" />
                                                        <span>${seg.costShare.toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                {seg.banDelay > 0 && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-900/10 p-1.5 rounded mb-2">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        <span>Ban Delay: +{seg.banDelay.toFixed(2)} hrs</span>
                                                    </div>
                                                )}

                                                {seg.vehicles && (
                                                    <div className="flex items-start gap-1.5 text-[10px] text-slate-500 pt-2 border-t border-white/5">
                                                        <Truck className="w-3 h-3 mt-0.5" />
                                                        <span className="line-clamp-1" title={seg.vehicles}>{seg.vehicles}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Final Destination Dot */}
                                    <div className="ml-6 relative">
                                        <div className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-900"></div>
                                        <p className="text-xs font-bold text-slate-500">Arrival at Destination</p>
                                    </div>

                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>

            {/* Shared Volumes Modal */}
            {sharedVolData && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-white font-bold">Shared Volumes: {sharedVolData.title}</h3>
                            <button onClick={() => setSharedVolData(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-0 overflow-auto flex-1">
                            <table className="w-full text-left text-xs text-slate-300">
                                <thead className="bg-slate-950 text-slate-400 font-bold uppercase sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Origin</th>
                                        <th className="px-4 py-3">Dest</th>
                                        <th className="px-4 py-3 text-right">Volume</th>
                                        <th className="px-4 py-3 text-right">Start Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {sharedVolData.items.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-800/50">
                                            <td className="px-4 py-2 font-mono">{row.id}</td>
                                            <td className="px-4 py-2">{row.path_origin}</td>
                                            <td className="px-4 py-2">{row.path_destination}</td>
                                            <td className="px-4 py-2 text-right">{row.total_pallet_count?.toFixed(4)}</td>
                                            <td className="px-4 py-2 text-right">{row.origin_cpt}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-500 text-right">
                            Total: {sharedVolData.items.length} shared paths
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
