
import React, { useState } from 'react';
import { ParametricEQ, EQBand } from './ParametricEQ';

export const ExampleUsage = () => {
    // Initial state with 3 bands
    const [bands, setBands] = useState<EQBand[]>([
        { id: '1', enabled: true, type: 'lowShelf', frequency: 100, gain: 0, q: 0.7 },
        { id: '2', enabled: true, type: 'peak', frequency: 1000, gain: 0, q: 1 },
        { id: '3', enabled: true, type: 'highShelf', frequency: 10000, gain: 0, q: 0.7 },
    ]);

    return (
        <div className="w-full h-screen bg-black p-20 flex items-center justify-center">
            <div className="w-[900px] h-[600px] border border-gray-800 rounded-xl overflow-hidden bg-zinc-950">
                <ParametricEQ
                    bands={bands}
                    onBandsChange={setBands}
                    themeColor="#06b6d4" // Cyan theme
                    selectedCount={1}
                    selectedSpeakers={['L']}
                />
            </div>
        </div>
    );
};

export default ExampleUsage;
