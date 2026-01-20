import React, { useState, useEffect } from 'react';
import { Source } from '../types';
import { Settings, Lock, LockOpen, ChevronDown, MonitorPlay, ArrowRightCircle } from 'lucide-react';

interface SourceStripProps {
    source: Source;
    selected: boolean;
    isEditing?: boolean; // 是否正在编辑此 Source
    onSelect: (id: string) => void;
    onToggleLock: (id: string) => void;
    onSettingsClick: () => void;
}

const getChannelCount = (format: string) => {
    switch (format) {
        case '9.1.6': return 16;
        case '7.1.4': return 12;
        case '5.1': return 6;
        case 'Stereo': return 2;
        case 'Mono': return 1;
        default: return 0;
    }
}

// THEMES - 玻璃态增强版本
const THEMES: Record<string, any> = {
    amber: {
        indicatorInactive: 'bg-[#3d2a0a]/30 shadow-[0_0_6px_rgba(212,137,15,0.04)]',
        indicatorActive: 'bg-[#d4890f] shadow-[0_0_10px_rgba(212,137,15,0.6)]',

        btnInactive: 'bg-gradient-to-b from-[#1f2024] to-[#151619] border-[#2a2b30] text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
        btnActive: 'bg-[#d4890f] border-[#b8770d] text-[#1a1400] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_12px_rgba(212,137,15,0.4)]',

        meterFill: 'bg-[#d4890f]',
        containerActive: 'border-[#d4890f] shadow-[0_0_20px_rgba(212,137,15,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-b from-[#d4890f]/15 to-[#d4890f]/5 backdrop-blur-sm',
    },
    blue: {
        indicatorInactive: 'bg-[#0a1a3d]/30 shadow-[0_0_6px_rgba(59,130,246,0.04)]',
        indicatorActive: 'bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.6)]',

        btnInactive: 'bg-gradient-to-b from-[#1f2024] to-[#151619] border-[#2a2b30] text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
        btnActive: 'bg-[#3b82f6] border-[#2563eb] text-[#001433] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_12px_rgba(59,130,246,0.4)]',

        meterFill: 'bg-[#3b82f6]',
        containerActive: 'border-[#3b82f6] shadow-[0_0_20px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-b from-[#3b82f6]/15 to-[#3b82f6]/5 backdrop-blur-sm',
    },
    green: {
        indicatorInactive: 'bg-[#0a2a1a]/30 shadow-[0_0_6px_rgba(15,160,112,0.04)]',
        indicatorActive: 'bg-[#0fa070] shadow-[0_0_10px_rgba(15,160,112,0.6)]',

        btnInactive: 'bg-gradient-to-b from-[#1f2024] to-[#151619] border-[#2a2b30] text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
        btnActive: 'bg-[#0fa070] border-[#0c7a56] text-[#001a0f] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_12px_rgba(15,160,112,0.4)]',

        meterFill: 'bg-[#0fa070]',
        containerActive: 'border-[#0fa070] shadow-[0_0_20px_rgba(15,160,112,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-b from-[#0fa070]/15 to-[#0fa070]/5 backdrop-blur-sm',
    },
    purple: {
        indicatorInactive: 'bg-[#1a0a2a]/30 shadow-[0_0_6px_rgba(147,74,217,0.04)]',
        indicatorActive: 'bg-[#934ad9] shadow-[0_0_10px_rgba(147,74,217,0.6)]',

        btnInactive: 'bg-gradient-to-b from-[#1f2024] to-[#151619] border-[#2a2b30] text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
        btnActive: 'bg-[#934ad9] border-[#7c3aed] text-[#0f0014] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_12px_rgba(147,74,217,0.4)]',

        meterFill: 'bg-[#934ad9]',
        containerActive: 'border-[#934ad9] shadow-[0_0_20px_rgba(147,74,217,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-b from-[#934ad9]/15 to-[#934ad9]/5 backdrop-blur-sm',
    },
    red: {
        indicatorInactive: 'bg-[#2a0a0a]/30 shadow-[0_0_6px_rgba(220,38,38,0.04)]',
        indicatorActive: 'bg-[#dc2626] shadow-[0_0_10px_rgba(220,38,38,0.6)]',

        btnInactive: 'bg-gradient-to-b from-[#1f2024] to-[#151619] border-[#2a2b30] text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
        btnActive: 'bg-[#dc2626] border-[#b91c1c] text-[#1a0000] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_12px_rgba(220,38,38,0.4)]',

        meterFill: 'bg-[#dc2626]',
        containerActive: 'border-[#dc2626] shadow-[0_0_20px_rgba(220,38,38,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-b from-[#dc2626]/15 to-[#dc2626]/5 backdrop-blur-sm',
    }
};

export const SourceStrip: React.FC<SourceStripProps> = ({ source, selected, isEditing, onSelect, onToggleLock, onSettingsClick }) => {
    const channelCount = getChannelCount(source.format);

    // Determine if color is a HEX value or theme name
    const isHexColor = source.color?.startsWith('#');
    const hexColor = isHexColor ? source.color : null;
    const themeName = !isHexColor ? source.color : 'amber';
    const theme = THEMES[themeName] || THEMES['amber'];

    // Meter Simulation
    const [meterLevels, setMeterLevels] = useState<number[]>([]);
    useEffect(() => {
        if (!source.assigned) return;
        setMeterLevels(new Array(channelCount).fill(0));
        const interval = setInterval(() => {
            const hasSignal = source.active || selected;
            if (hasSignal) {
                setMeterLevels(prev => Array.from({ length: channelCount }).map((_, i) => {
                    const base = Math.random() * 50 + 30;
                    const boost = (Math.random() > 0.8) ? 30 : 0;
                    return Math.min(105, base + boost + (i < 3 ? 10 : 0));
                }));
            } else {
                setMeterLevels(new Array(channelCount).fill(0));
            }
        }, 80);
        return () => clearInterval(interval);
    }, [channelCount, source.active, selected, source.assigned]);

    // UNASSIGNED STATE
    if (!source.assigned) {
        return (
            <div className="relative w-full h-[90px] rounded-xl p-1 mb-3 border border-[#2a2b30]/40 bg-[#0c0d11] opacity-40 select-none transition-all duration-300 hover:opacity-60 hover:border-[#3f3f46]/50 group">
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#2a2b30] rounded-r-md"></div>
                {/* Header */}
                <div className="flex items-center gap-2 mb-2 pl-4 pt-2">
                    <div className="h-4 w-1 bg-[#2a2b30] rounded-full"></div>
                    <span className="text-[#52525b] font-medium text-sm group-hover:text-[#71717a] transition-colors">Empty Slot</span>
                    <Settings size={14} className="text-[#3f3f46] ml-auto mr-2 group-hover:text-[#52525b]" />
                </div>
                {/* Empty Well */}
                <div className="mx-4 h-10 bg-[#08090c]/30 rounded-lg border border-dashed border-[#2a2b30] flex items-center justify-center group-hover:border-[#3f3f46] transition-colors">
                    <span className="text-[9px] uppercase text-[#3f3f46] font-bold tracking-[0.2em] group-hover:text-[#52525b]">Unassigned</span>
                </div>
            </div>
        );
    }

    // ACTIVE / ASSIGNED STATE
    // 计算编辑模式下的颜色
    const activeColor = hexColor || (themeName ? {
        amber: '#f59e0b',
        blue: '#3b82f6',
        green: '#22c55e',
        purple: '#a855f7',
        red: '#ef4444',
    }[themeName] : '#f59e0b');

    return (
        <div
            className={`
        relative w-full rounded-xl p-1.5 mb-2 transition-all duration-300 ease-out select-none group transform-gpu border
        ${isEditing
                    ? 'ring-1 ring-offset-1 ring-offset-zinc-950'
                    : selected
                        ? hexColor
                            ? 'scale-[1.01] shadow-lg backdrop-blur-sm'
                            : `${theme.containerActive} scale-[1.01] shadow-lg`
                        : 'bg-gradient-to-b from-[#141418]/90 to-[#0f1014]/95 backdrop-blur-sm border-white/[0.06] hover:border-white/[0.1] hover:from-[#18181c]/90 hover:to-[#111216]/95'}
        ${isEditing ? 'cursor-default' : 'cursor-pointer'}
      `}
            style={isEditing ? {
                borderColor: activeColor,
                boxShadow: `0 0 25px ${activeColor}40`,
                backgroundColor: `${activeColor}15`,
                // @ts-ignore - CSS 变量
                '--tw-ring-color': activeColor,
            } : selected && hexColor ? {
                borderColor: `${hexColor}80`,
                boxShadow: `0 0 20px ${hexColor}25`,
                backgroundColor: `${hexColor}15`
            } : undefined}
            onClick={() => !isEditing && onSelect(source.id)}
        >

            {/* 顶部高光线 - 玻璃态效果 */}
            <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent rounded-full"></div>

            {/* Persistent Color Indicator */}
            <div
                className={`
                    absolute left-[-1px] top-4 bottom-4 w-1.5 rounded-r-md transition-all duration-300 z-10
                    ${isEditing ? 'animate-pulse' : ''}
                    ${!hexColor && !isEditing ? (selected ? theme.indicatorActive : theme.indicatorInactive) : ''}
                `}
                style={isEditing ? {
                    backgroundColor: activeColor,
                    boxShadow: `0 0 20px ${activeColor}`
                } : hexColor ? {
                    backgroundColor: selected ? hexColor : `${hexColor}30`,
                    boxShadow: selected ? `0 0 12px ${hexColor}cc` : `0 0 8px ${hexColor}10`
                } : undefined}
            ></div>

            {/* --- ROW 1: HEADER --- */}
            <div className="flex items-center justify-between gap-3 mb-2 pl-4 pr-1 pt-2">
                {/* Format - Stronger Presence */}
                <span className={`text-xs font-bold font-mono tracking-wide min-w-[32px] transition-colors ${selected ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
                    {source.format}
                </span>

                {/* Source Selector Box - Simplified */}
                <div className="flex-1 flex items-center gap-2 overflow-hidden ml-1">
                    {/* Source Icon */}
                    <div className={`shrink-0 transition-colors ${selected ? 'text-[#d4d4d8]' : 'text-[#52525b]'}`}>
                        <ArrowRightCircle size={15} strokeWidth={2} />
                    </div>

                    {/* Source Name */}
                    <span className={`text-xs font-bold truncate flex-1 transition-colors ${selected ? 'text-[#e4e4e7]' : 'text-[#71717a]'}`}>
                        {source.name}
                    </span>
                </div>

                {/* Settings Button */}
                <button
                    className="text-[#52525b] hover:text-[#a1a1aa] transition-colors p-1 shrink-0 rounded hover:bg-[#1a1b1f]/50"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSettingsClick();
                    }}
                >
                    <Settings size={14} />
                </button>
            </div>

            {/* --- ROW 2: CONTROLS WELL --- */}
            <div className="flex items-start gap-3 pl-4 pr-2 pb-1 h-[60px]">

                {/* 1. METER WELL */}
                <div className="h-full w-[80px] bg-[#08090c]/90 backdrop-blur-[2px] rounded-md border border-[#1a1b1f] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,0,0,0.3)] relative overflow-hidden flex items-end px-[2px] pb-[2px] pt-[5px]">
                    {/* Screen Glass Reflection */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent opacity-40 pointer-events-none z-40"></div>
                    {/* 顶部内阴影增强 */}
                    <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-30"></div>
                    {/* Dark Scanline Overlay */}
                    <div className="absolute inset-0 z-20 pointer-events-none opacity-20"
                        style={{ backgroundImage: 'linear-gradient(0deg, #000 50%, transparent 50%)', backgroundSize: '100% 2px' }}>
                    </div>
                    {/* Meter Bars */}
                    <div className="w-full h-full flex items-end gap-[1px]">
                        {meterLevels.map((level, i) => {
                            const isClipped = level > 98;
                            return (
                                <div key={i} className="flex-1 h-full bg-[#151619]/40 rounded-[1px] relative flex flex-col-reverse">
                                    <div className={`
                                absolute -top-[4px] left-0 right-0 h-[2px] rounded-full transition-colors duration-100 z-30
                                ${isClipped ? 'bg-[#dc2626] shadow-[0_0_6px_#dc2626]' : 'bg-[#2a2b30]'}
                            `}></div>
                                    <div
                                        className={`w-full rounded-[1px] transition-all duration-75 ease-out ${!hexColor && selected ? theme.meterFill : !selected ? 'bg-[#3f3f46]' : ''}`}
                                        style={{
                                            height: `${Math.min(100, level)}%`,
                                            opacity: selected ? 1 : 0.4,
                                            backgroundColor: hexColor && selected ? hexColor : undefined
                                        }}
                                    ></div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. TRIM FADER */}
                <div className="h-full w-4 flex flex-col items-center justify-center relative group/trim cursor-ns-resize">
                    <div className="w-0.5 h-[80%] bg-[#2a2b30] rounded-full group-hover/trim:bg-[#3f3f46] transition-colors"></div>
                    <div className={`absolute w-3 h-2 rounded-[1px] shadow-sm top-1/2 -translate-y-1/2 transition-colors ${selected ? 'bg-[#71717a] shadow-[0_0_5px_rgba(255,255,255,0.15)]' : 'bg-[#52525b]'}`}></div>
                </div>

                {/* 3. BUTTON & LOCK GROUP (Flex Column) */}
                <div className="h-full flex flex-col items-center justify-between py-0.5 ml-1">
                    {/* Monitor/Activate Button */}
                    <div
                        className={`
                            h-8 w-11 rounded-[4px] border flex items-center justify-center transition-all duration-300
                            ${!hexColor ? (selected ? theme.btnActive : theme.btnInactive) : (selected ? '' : theme.btnInactive)}
                        `}
                        style={hexColor && selected ? {
                            backgroundColor: hexColor,
                            borderColor: `${hexColor}cc`,
                            color: '#000',
                            boxShadow: `inset 0 1px 4px rgba(255,255,255,0.4), 0 0 15px ${hexColor}80`
                        } : undefined}
                    >
                        <MonitorPlay size={16} strokeWidth={selected ? 2.5 : 2} className={selected ? 'animate-pulse-slow' : 'opacity-80'} />
                    </div>

                    {/* Lock Toggle */}
                    <button
                        className={`
                   w-full h-4 flex items-center justify-center rounded-[3px] transition-all duration-200 border
                   ${source.locked
                                ? 'bg-[#1a1b1f] border-[#3f3f46] text-[#a1a1aa] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]'
                                : 'bg-transparent border-transparent text-[#3f3f46] hover:text-[#71717a] hover:bg-[#151619]/50'}
                `}
                        onClick={(e) => { e.stopPropagation(); onToggleLock(source.id); }}
                        title={source.locked ? "Source Locked (Active)" : "Lock Source"}
                    >
                        {source.locked ? <Lock size={10} strokeWidth={2.5} /> : <LockOpen size={10} />}
                    </button>
                </div>

                {/* 4. FX GROUP (Knob Removed) */}
                <div className="flex-1 flex items-center justify-end h-full gap-2">
                    {/* FX Indicator */}
                    <div className="flex flex-col items-center justify-center h-full gap-0.5">
                        <span className={`text-[8px] font-bold tracking-wider ${selected ? 'text-[#71717a]' : 'text-[#3f3f46]'}`}>FX</span>
                        <ChevronDown size={10} className="text-[#3f3f46]" />
                    </div>
                </div>

            </div>
        </div>
    );
};