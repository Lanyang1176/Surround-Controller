import React from 'react';
export interface EQBand {
    id: string;
    enabled: boolean;
    type: 'peak' | 'lowShelf' | 'highShelf' | 'lowPass' | 'highPass';
    frequency: number;
    gain: number;
    q: number;
}
interface ParametricEQProps {
    bands: EQBand[];
    onBandsChange: (bands: EQBand[]) => void;
    themeColor: string;
    selectedCount: number;
    selectedSpeakers?: string[];
}
export declare const ParametricEQ: React.FC<ParametricEQProps>;
export default ParametricEQ;
