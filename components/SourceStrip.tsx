import React, { useState, useEffect } from 'react';
import { Source } from '../types';
import { Settings, Lock, LockOpen, ChevronDown, MonitorPlay, ArrowRightCircle } from 'lucide-react';
import { Knob } from './Knob';

interface SourceStripProps {
    source: Source;
    selected: boolean;
    isEditing?: boolean; // 是否正在编辑此 Source
    showTrim?: boolean;
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

// THEMES - 玻璃感版本，高对比度：亮边框 + 暗内填充
const THEMES: Record<string, any> = {
    amber: {
        indicatorInactive: 'bg-[#3d2a0a]/15 shadow-none',
        indicatorActive: 'bg-[#ffaa00] shadow-[0_0_14px_rgba(255,170,0,0.8)]',

        btnInactive: 'bg-gradient-to-b from-[#16171a] to-[#0e0f12] border-[#222326] text-[#404048] shadow-[0_1px_3px_rgba(0,0,0,0.6)]',
        btnActive: 'bg-[#ffaa00] border-[#cc8800] text-[#1a1400] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_14px_rgba(255,170,0,0.6)]',

        meterFill: 'bg-[#ffaa00]',
        containerActive: 'border-[#ffaa00]/60 shadow-[0_0_24px_rgba(255,170,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#ffaa00]/[0.02]',
    },
    blue: {
        indicatorInactive: 'bg-[#0a1a3d]/15 shadow-none',
        indicatorActive: 'bg-[#3baaff] shadow-[0_0_14px_rgba(59,170,255,0.8)]',

        btnInactive: 'bg-gradient-to-b from-[#16171a] to-[#0e0f12] border-[#222326] text-[#404048] shadow-[0_1px_3px_rgba(0,0,0,0.6)]',
        btnActive: 'bg-[#3baaff] border-[#2585cc] text-[#001433] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_14px_rgba(59,170,255,0.6)]',

        meterFill: 'bg-[#3baaff]',
        containerActive: 'border-[#3baaff]/60 shadow-[0_0_24px_rgba(59,170,255,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#3baaff]/[0.02]',
    },
    green: {
        indicatorInactive: 'bg-[#0a2a1a]/15 shadow-none',
        indicatorActive: 'bg-[#00e890] shadow-[0_0_14px_rgba(0,232,144,0.8)]',

        btnInactive: 'bg-gradient-to-b from-[#16171a] to-[#0e0f12] border-[#222326] text-[#404048] shadow-[0_1px_3px_rgba(0,0,0,0.6)]',
        btnActive: 'bg-[#00e890] border-[#00b870] text-[#001a0f] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_14px_rgba(0,232,144,0.6)]',

        meterFill: 'bg-[#00e890]',
        containerActive: 'border-[#00e890]/60 shadow-[0_0_24px_rgba(0,232,144,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#00e890]/[0.02]',
    },
    purple: {
        indicatorInactive: 'bg-[#1a0a2a]/15 shadow-none',
        indicatorActive: 'bg-[#bf5fff] shadow-[0_0_14px_rgba(191,95,255,0.8)]',

        btnInactive: 'bg-gradient-to-b from-[#16171a] to-[#0e0f12] border-[#222326] text-[#404048] shadow-[0_1px_3px_rgba(0,0,0,0.6)]',
        btnActive: 'bg-[#bf5fff] border-[#9944cc] text-[#0f0014] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_14px_rgba(191,95,255,0.6)]',

        meterFill: 'bg-[#bf5fff]',
        containerActive: 'border-[#bf5fff]/60 shadow-[0_0_24px_rgba(191,95,255,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#bf5fff]/[0.02]',
    },
    red: {
        indicatorInactive: 'bg-[#2a0a0a]/15 shadow-none',
        indicatorActive: 'bg-[#ff3b3b] shadow-[0_0_14px_rgba(255,59,59,0.8)]',

        btnInactive: 'bg-gradient-to-b from-[#16171a] to-[#0e0f12] border-[#222326] text-[#404048] shadow-[0_1px_3px_rgba(0,0,0,0.6)]',
        btnActive: 'bg-[#ff3b3b] border-[#cc2020] text-[#1a0000] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_14px_rgba(255,59,59,0.6)]',

        meterFill: 'bg-[#ff3b3b]',
        containerActive: 'border-[#ff3b3b]/60 shadow-[0_0_24px_rgba(255,59,59,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#ff3b3b]/[0.02]',
    }
};

export const SourceStrip: React.FC<SourceStripProps> = ({ source, selected, isEditing, showTrim = true, onSelect, onToggleLock, onSettingsClick }) => {
    const channelCount = getChannelCount(source.format);
    const shouldShowTrim = Boolean(showTrim);

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
        relative w-full rounded-xl p-1.5 mb-2 transition-all duration-300 ease-out select-none group transform-gpu border backdrop-blur-md
        ${isEditing
                    ? 'ring-1 ring-offset-1 ring-offset-zinc-950'
                    : selected
                        ? hexColor
                            ? 'scale-[1.01] shadow-xl'
                            : `${theme.containerActive} scale-[1.01] shadow-xl`
                        : 'bg-[#06070a]/85 border-[#252830]/70 hover:border-[#353840]/80 hover:bg-[#08090c]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_8px_rgba(0,0,0,0.4)]'}
        ${isEditing ? 'cursor-default' : 'cursor-pointer'}
      `}
            style={isEditing ? {
                borderColor: activeColor,
                boxShadow: `0 0 28px ${activeColor}35`,
                backgroundColor: `${activeColor}05`,
                // @ts-ignore - CSS 变量
                '--tw-ring-color': activeColor,
            } : selected && hexColor ? {
                borderColor: `${hexColor}70`,
                boxShadow: `0 0 24px ${hexColor}30, inset 0 1px 0 rgba(255,255,255,0.03)`,
                backgroundColor: `${hexColor}03`
            } : undefined}
            onClick={() => !isEditing && onSelect(source.id)}
        >

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
            <div className="flex items-center gap-3 mb-2 pl-4 pr-1 pt-2">
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

                {/* Right Controls - 锁在左，设置在右 */}
                <div className="ml-auto flex items-center gap-0.5">
                    <button
                        className={`
                            h-5 w-5 flex items-center justify-center rounded-[3px] transition-all duration-200
                            ${source.locked
                                ? 'text-[#a1a1aa]'
                                : 'text-[#3f3f46] hover:text-[#71717a]'}
                        `}
                        onClick={(e) => { e.stopPropagation(); onToggleLock(source.id); }}
                        title={source.locked ? "Source Locked (Active)" : "Lock Source"}
                    >
                        {source.locked ? <Lock size={11} strokeWidth={2.5} /> : <LockOpen size={11} />}
                    </button>
                    <button
                        className="text-[#52525b] hover:text-[#a1a1aa] transition-colors p-0.5 shrink-0 rounded hover:bg-[#1a1b1f]/50"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSettingsClick();
                        }}
                    >
                        <Settings size={13} />
                    </button>
                </div>
            </div>

            {/* --- ROW 2: CONTROLS WELL --- */}
            <div className="flex items-start gap-2 pl-4 pr-2 pb-1 h-[60px]">

                {/* 1. METER SECTION - 独立容器，玻璃内嵌 */}
                <div className="h-full w-[100px] bg-[#050607]/80 rounded-md border border-[#18191d]/50 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.02)] overflow-hidden">
                    <div className="h-full relative flex items-end px-[2px] pb-[2px] pt-[5px]">
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
                </div>

                {/* 2. TRIM KNOB SECTION - 无背景，带过渡动画 */}
                <div 
                    className={`h-full flex flex-col items-center justify-center relative group/knob overflow-hidden transition-all duration-300 ease-out ${shouldShowTrim ? 'w-[42px] opacity-100' : 'w-0 opacity-0'}`}
                >
                    {/* Label */}
                    <span className={`absolute top-0 text-[8px] font-bold tracking-wider transition-colors whitespace-nowrap ${selected ? 'text-[#52525b] group-hover/knob:text-[#71717a]' : 'text-[#2a2b30]'}`}>TRIM</span>
                    <div className="mt-1">
                        <Knob
                            size={32}
                            value={83}
                            color={activeColor}
                            inactive={!selected}
                        />
                    </div>
                </div>

                {/* 3. BUTTON GROUP (Flex Column) */}
                <div className="h-full flex flex-col items-center justify-center">
                    {/* Monitor/Activate Button */}
                    <div
                        className={`
                            h-7 w-8 rounded-[4px] border flex items-center justify-center transition-all duration-300
                            ${!hexColor ? (selected ? theme.btnActive : theme.btnInactive) : (selected ? '' : theme.btnInactive)}
                        `}
                        style={hexColor && selected ? {
                            backgroundColor: hexColor,
                            borderColor: `${hexColor}cc`,
                            color: '#000',
                            boxShadow: `inset 0 1px 4px rgba(255,255,255,0.4), 0 0 15px ${hexColor}80`
                        } : undefined}
                    >
                        <MonitorPlay size={14} strokeWidth={selected ? 2.5 : 2} className={selected ? 'animate-pulse-slow' : 'opacity-70'} />
                    </div>
                </div>

                {/* 4. FX GROUP */}
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