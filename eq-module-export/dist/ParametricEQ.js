import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Trash2, ChevronDown, Power } from 'lucide-react';
// ═══════════════════════════════════════════════════════════════════════
// Constants - Professional Audio Tool Style
// ═══════════════════════════════════════════════════════════════════════
const MIN_FREQ = 10;
const MAX_FREQ = 30000;
const MIN_GAIN = -24;
const MAX_GAIN = 24;
const MIN_Q = 0.1;
const MAX_Q = 10;
const MAX_BANDS = 12;
// 用于曲线渲染的扩展范围 (视觉负无穷)
const VISUAL_MIN_GAIN = -30; // 给底部留透气空间 (24dB -> 80%)
const VISUAL_MAX_GAIN = 30; // 给顶部留透气空间
// ... (BAND_COLORS omitted)
// 增益网格 - 每 6dB 一条（精简版）
const GAIN_GRID_LINES = (() => {
    const lines = [];
    for (let g = -24; g <= 24; g += 6) {
        lines.push(g);
    }
    return lines;
})();
// 10色柔和有机色板 - Sonarworks 现代风格
// 特点：饱和度适中、色相间隔均匀、视觉舒适、通透感
const BAND_COLORS = [
    '#5EEAD4', // 1. 青绿 (Teal) - 柔和
    '#7DD3FC', // 2. 天蓝 (Sky) - 明亮但不刺眼
    '#A5B4FC', // 3. 靛蓝 (Indigo) - 柔和紫蓝
    '#C4B5FD', // 4. 薰衣草 (Violet)
    '#F0ABFC', // 5. 粉紫 (Fuchsia)
    '#FDA4AF', // 6. 玫瑰 (Rose)
    '#FDBA74', // 7. 橙 (Orange) - 柔和
    '#FCD34D', // 8. 琥珀 (Amber)
    '#BEF264', // 9. 青柠 (Lime)
    '#6EE7B7', // 10. 翠绿 (Emerald)
];
const FILTER_TYPES = [
    { value: 'highPass', label: 'High Pass', shortLabel: 'HP' },
    { value: 'lowShelf', label: 'Low Shelf', shortLabel: 'LS' },
    { value: 'peak', label: 'Bell', shortLabel: 'PK' },
    { value: 'highShelf', label: 'High Shelf', shortLabel: 'HS' },
    { value: 'lowPass', label: 'Low Pass', shortLabel: 'LP' },
];
// 专业对数网格 - 主刻度 (10, 100, 1k, 10k, 20k 等)
const LOG_MAJOR_FREQS = [10, 100, 1000, 10000, 20000];
// 刻度标签专用频率 - 只显示这些文字
const LABEL_FREQS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
// 次刻度 (每个十倍频程内的 2, 3, 4...9 倍频点)
const LOG_MINOR_FREQS = (() => {
    const minors = [];
    // 10Hz ~ 20kHz 的标准对数次刻度 - 去掉 7,8,9 倍频点（最密集区域）
    for (const base of [10, 100, 1000, 10000]) {
        for (const mult of [2, 3, 4, 5, 6]) {
            const f = base * mult;
            if (f >= 10 && f <= 30000)
                minors.push(f);
        }
    }
    // 添加 20k 和 30k 作为边界透气区域
    minors.push(20000, 30000);
    return minors;
})();
// 合并用于渲染的完整频率刻度
const ALL_FREQ_GRID_LINES = [...LOG_MAJOR_FREQS, ...LOG_MINOR_FREQS].sort((a, b) => a - b);
// 扬声器颜色映射
const SPEAKER_COLORS = {
    'L': '#fb7185', 'R': '#fb7185', 'C': '#fb7185',
    'LFE': '#c084fc',
    'Ls': '#4ade80', 'Rs': '#4ade80', 'Lrs': '#4ade80', 'Rrs': '#4ade80',
    'Lw': '#4ade80', 'Rw': '#4ade80',
    'Ltf': '#38bdf8', 'Rtf': '#38bdf8', 'Ltm': '#38bdf8', 'Rtm': '#38bdf8',
    'Ltr': '#38bdf8', 'Rtr': '#38bdf8',
};
const SPEAKER_NAMES = {
    'L': 'Left Front', 'R': 'Right Front', 'C': 'Center',
    'LFE': 'Subwoofer',
    'Ls': 'Left Surround', 'Rs': 'Right Surround',
    'Lrs': 'Left Rear', 'Rrs': 'Right Rear',
    'Lw': 'Left Wide', 'Rw': 'Right Wide',
    'Ltf': 'Left Top Front', 'Rtf': 'Right Top Front',
    'Ltm': 'Left Top Mid', 'Rtm': 'Right Top Mid',
    'Ltr': 'Left Top Rear', 'Rtr': 'Right Top Rear',
};
// ═══════════════════════════════════════════════════════════════════════
// Filter Type Icons (SVG paths)
// ═══════════════════════════════════════════════════════════════════════
const FilterIcon = ({ type, className = "w-4 h-3", style }) => {
    const paths = {
        highPass: "M2 10 L5 10 Q7 10 9 6 L14 2",
        lowPass: "M2 2 L7 6 Q9 10 11 10 L14 10",
        peak: "M2 8 Q5 8 7 3 Q9 8 12 8 L14 8",
        lowShelf: "M2 4 L5 4 Q7 4 8 7 L14 7",
        highShelf: "M2 7 L6 7 Q7 7 8 4 L14 4",
    };
    return (_jsx("svg", { viewBox: "0 0 16 12", className: className, style: style, fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: paths[type] }) }));
};
const BandOverviewCard = ({ band, index, color, isSelected, isHovered, isAdjusting, onClick, onMouseEnter, onMouseLeave, onUpdate, onAdjust }) => {
    const isHpLp = band.type === 'highPass' || band.type === 'lowPass';
    const isActive = isSelected || isHovered || isAdjusting;
    // ═══════════════════════════════════════════════════════════════════════
    // 交互逻辑：滚轮 & 拖拽
    // ═══════════════════════════════════════════════════════════════════════
    const handleWheel = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        onAdjust(band.id);
        const delta = -e.deltaY;
        const factor = e.shiftKey ? 0.1 : 1;
        if (type === 'F') {
            const step = factor * (band.frequency * 0.05); // 指数级步进
            const nextFreq = Math.max(20, Math.min(20000, band.frequency + (delta > 0 ? step : -step)));
            onUpdate(band.id, { frequency: nextFreq });
        }
        else if (type === 'G' && !isHpLp) {
            const step = factor * 0.5;
            const nextGain = Math.max(-24, Math.min(24, band.gain + (delta > 0 ? step : -step)));
            onUpdate(band.id, { gain: nextGain });
        }
        else if (type === 'Q') {
            const step = factor * 0.1;
            const nextQ = Math.max(0.1, Math.min(40, band.q + (delta > 0 ? step : -step)));
            onUpdate(band.id, { q: nextQ });
        }
    };
    const [dragState, setDragState] = React.useState(null);
    const handleMouseDown = (e, type) => {
        if (type === 'G' && isHpLp)
            return;
        e.preventDefault();
        e.stopPropagation();
        onAdjust(band.id);
        setDragState({
            type,
            startY: e.clientY,
            startVal: type === 'F' ? band.frequency : (type === 'G' ? band.gain : band.q)
        });
    };
    React.useEffect(() => {
        if (!dragState)
            return;
        const handleMouseMove = (e) => {
            const deltaY = dragState.startY - e.clientY;
            const factor = e.shiftKey ? 0.1 : 1;
            onAdjust(band.id);
            if (dragState.type === 'F') {
                const nextFreq = Math.max(20, Math.min(20000, dragState.startVal * Math.pow(1.01, deltaY * factor)));
                onUpdate(band.id, { frequency: nextFreq });
            }
            else if (dragState.type === 'G') {
                const nextGain = Math.max(-24, Math.min(24, dragState.startVal + deltaY * 0.2 * factor));
                onUpdate(band.id, { gain: nextGain });
            }
            else if (dragState.type === 'Q') {
                const nextQ = Math.max(0.1, Math.min(40, dragState.startVal + deltaY * 0.05 * factor));
                onUpdate(band.id, { q: nextQ });
            }
        };
        const handleMouseUp = () => setDragState(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, band.id, onUpdate, onAdjust]);
    // 将 hex 颜色转换为带透明度的 rgba（降低饱和度）
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    // 色块使用 65% 透明度，降低饱和度感
    const colorBlockBg = hexToRgba(color, isActive ? 0.75 : 0.55);
    return (_jsxs("div", { onMouseEnter: onMouseEnter, onMouseLeave: onMouseLeave, className: `flex shrink-0 rounded overflow-hidden border transition-all duration-150 ease-out ${band.enabled
            ? 'bg-zinc-900/70 hover:bg-zinc-800/70'
            : 'bg-zinc-900/30 opacity-40'} ${isSelected ? 'scale-[1.02]' : ''} ${isHovered && !isSelected ? 'scale-[1.01]' : ''}`, style: {
            borderColor: isActive ? hexToRgba(color, 0.5) : 'rgba(63,63,70,0.25)',
            boxShadow: isAdjusting
                ? `0 0 14px ${color}55, inset 0 0 8px ${color}18`
                : (isSelected
                    ? `0 0 10px ${color}25, inset 0 0 6px ${color}08`
                    : (isHovered ? `0 0 6px ${color}15` : 'none')),
            width: '88px',
            height: '64px',
        }, children: [_jsx("button", { onClick: onClick, className: "shrink-0 h-full flex items-center justify-center transition-all duration-150 active:scale-95", style: {
                    width: '18px',
                    backgroundColor: colorBlockBg,
                    boxShadow: isActive ? `1px 0 6px ${color}30` : 'none'
                }, children: _jsx(FilterIcon, { type: band.type, className: "w-3.5 h-3 transition-opacity duration-100", style: { color: 'rgba(255,255,255,0.92)' } }) }), _jsxs("div", { className: "flex-1 flex flex-col justify-center px-2 py-1.5 gap-1 select-none", children: [_jsxs("div", { className: "flex items-center gap-1.5 cursor-ns-resize hover:bg-white/5 rounded px-0.5 transition-colors", onWheel: (e) => handleWheel(e, 'F'), onMouseDown: (e) => handleMouseDown(e, 'F'), children: [_jsx("span", { className: "text-[10px] text-zinc-500 font-medium w-2 shrink-0", children: "F" }), _jsx("span", { className: "text-[12px] text-zinc-50 font-medium leading-tight", style: { fontFamily: "'JetBrains Mono', monospace" }, children: formatFreq(band.frequency) })] }), _jsxs("div", { className: `flex items-center gap-1.5 ${isHpLp ? 'cursor-default' : 'cursor-ns-resize hover:bg-white/5'} rounded px-0.5 transition-colors`, onWheel: (e) => !isHpLp && handleWheel(e, 'G'), onMouseDown: (e) => !isHpLp && handleMouseDown(e, 'G'), children: [_jsx("span", { className: "text-[10px] text-zinc-500 font-medium w-2 shrink-0", children: "G" }), _jsx("span", { className: "text-[12px] font-medium leading-tight", style: {
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: isHpLp ? '#a1a1aa' : (band.gain > 0 ? '#86efac' : (band.gain < 0 ? '#fca5a5' : '#d4d4d8'))
                                }, children: isHpLp ? '—' : ((band.gain > 0 ? '+' : '') + band.gain.toFixed(1)) })] }), _jsxs("div", { className: "flex items-center gap-1.5 cursor-ns-resize hover:bg-white/5 rounded px-0.5 transition-colors", onWheel: (e) => handleWheel(e, 'Q'), onMouseDown: (e) => handleMouseDown(e, 'Q'), children: [_jsx("span", { className: "text-[10px] text-zinc-500 font-medium w-2 shrink-0", children: "Q" }), _jsx("span", { className: "text-[12px] text-zinc-200 font-medium leading-tight", style: { fontFamily: "'JetBrains Mono', monospace" }, children: band.q.toFixed(1) })] })] })] }));
};
// ═══════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════
const freqToX = (freq, width) => {
    const minLog = Math.log10(MIN_FREQ);
    const maxLog = Math.log10(MAX_FREQ);
    return ((Math.log10(freq) - minLog) / (maxLog - minLog)) * width;
};
const xToFreq = (x, width) => {
    const minLog = Math.log10(MIN_FREQ);
    const maxLog = Math.log10(MAX_FREQ);
    const log = minLog + (x / width) * (maxLog - minLog);
    return Math.pow(10, log);
};
const gainToY = (gain, height) => {
    return ((VISUAL_MAX_GAIN - gain) / (VISUAL_MAX_GAIN - VISUAL_MIN_GAIN)) * height;
};
const yToGain = (y, height) => {
    return VISUAL_MAX_GAIN - (y / height) * (VISUAL_MAX_GAIN - VISUAL_MIN_GAIN);
};
const formatFreq = (freq) => {
    // FabFilter-like labels: 20 50 100 ... 1k 2k 5k 10k 20k
    const f = Math.round(freq);
    if (f >= 1000) {
        // Prefer integer 'k' for round thousands.
        if (f % 1000 === 0)
            return `${f / 1000}k`;
        // Fallback: one decimal for non-round values.
        const v = f / 1000;
        return `${v >= 10 ? v.toFixed(1) : v.toFixed(1)}k`;
    }
    return `${f}`;
};
const formatFreqFull = (freq) => {
    if (freq >= 1000)
        return `${(freq / 1000).toFixed(2)} kHz`;
    return `${Math.round(freq)} Hz`;
};
// 智能频率解析 (支持 2.5k -> 2500)
const parseFreqInput = (input) => {
    const cleaned = input.trim().toLowerCase().replace(/\s+/g, '').replace('hz', '');
    const kMatch = cleaned.match(/^([\d.]+)k$/);
    if (kMatch) {
        const val = parseFloat(kMatch[1]) * 1000;
        return isNaN(val) ? null : val;
    }
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
};
const generateId = () => Math.random().toString(36).substr(2, 9);
// ═══════════════════════════════════════════════════════════════════════
// EQ Curve Calculation (物理正确的滤波器响应)
// ═══════════════════════════════════════════════════════════════════════
const calculateBandResponse = (band, freq) => {
    if (!band.enabled)
        return 0;
    const f0 = band.frequency;
    const gain = band.gain;
    const Q = Math.max(0.1, band.q);
    switch (band.type) {
        case 'peak': {
            const octaves = Math.log2(freq / f0);
            const bandwidth = 1 / Q;
            const x = octaves / bandwidth;
            return gain * Math.exp(-0.5 * x * x * 4);
        }
        case 'lowShelf': {
            const octaves = Math.log2(freq / f0);
            const slope = Q * 2;
            return gain * 0.5 * (1 - Math.tanh(octaves * slope));
        }
        case 'highShelf': {
            const octaves = Math.log2(freq / f0);
            const slope = Q * 2;
            return gain * 0.5 * (1 + Math.tanh(octaves * slope));
        }
        case 'highPass': {
            // HP: 截止频率以下衰减到负无穷 (不限制最小值)
            if (freq >= f0)
                return 0;
            const octaves = Math.log2(freq / f0);
            const slope = 12 * Q;
            return octaves * slope; // 允许返回 -100dB 或更低
        }
        case 'lowPass': {
            // LP: 截止频率以上衰减到负无穷 (不限制最小值)
            if (freq <= f0)
                return 0;
            const octaves = Math.log2(freq / f0);
            const slope = 12 * Q;
            return -octaves * slope; // 允许返回 -100dB 或更低
        }
        default:
            return 0;
    }
};
const calculateTotalResponse = (bands, freq) => {
    return bands.reduce((sum, band) => sum + calculateBandResponse(band, freq), 0);
};
// ═══════════════════════════════════════════════════════════════════════
// Animated Value Hook
// ═══════════════════════════════════════════════════════════════════════
// 优化动画：更短时长、更轻柔的 easing
const useAnimatedBands = (bands, duration = 120, skipAnimation = false) => {
    const [animatedBands, setAnimatedBands] = useState(bands);
    const animationRef = useRef();
    const startTimeRef = useRef();
    const startBandsRef = useRef(bands);
    const targetBandsRef = useRef(bands);
    useEffect(() => {
        if (skipAnimation) {
            if (animationRef.current)
                cancelAnimationFrame(animationRef.current);
            setAnimatedBands(bands);
            return;
        }
        if (animationRef.current)
            cancelAnimationFrame(animationRef.current);
        startBandsRef.current = animatedBands;
        targetBandsRef.current = bands;
        startTimeRef.current = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - (startTimeRef.current || currentTime);
            const progress = Math.min(elapsed / duration, 1);
            // 更轻柔的 ease-out-quad (而非 ease-out-cubic)
            const eased = 1 - Math.pow(1 - progress, 2);
            if (progress < 1) {
                const interpolated = targetBandsRef.current.map((targetBand) => {
                    const startBand = startBandsRef.current.find(b => b.id === targetBand.id);
                    if (!startBand)
                        return targetBand;
                    return {
                        ...targetBand,
                        frequency: startBand.frequency + (targetBand.frequency - startBand.frequency) * eased,
                        gain: startBand.gain + (targetBand.gain - startBand.gain) * eased,
                        q: startBand.q + (targetBand.q - startBand.q) * eased,
                    };
                });
                setAnimatedBands(interpolated);
                animationRef.current = requestAnimationFrame(animate);
            }
            else {
                setAnimatedBands(bands);
            }
        };
        animationRef.current = requestAnimationFrame(animate);
        return () => { if (animationRef.current)
            cancelAnimationFrame(animationRef.current); };
    }, [bands, duration, skipAnimation]);
    return animatedBands;
};
const EditableValue = ({ value, format, parse, min, max, onChange, className = "", style }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef(null);
    const handleDoubleClick = () => {
        setIsEditing(true);
        setInputValue(format(value).replace(/[^\d.k-]/gi, ''));
    };
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);
    const handleBlur = () => {
        setIsEditing(false);
        const parser = parse || parseFloat;
        const parsed = parser(inputValue);
        if (parsed !== null && !isNaN(parsed)) {
            const clamped = Math.max(min, Math.min(max, parsed));
            onChange(clamped);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
        else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };
    if (isEditing) {
        return (_jsx("input", { ref: inputRef, type: "text", value: inputValue, onChange: (e) => setInputValue(e.target.value), onBlur: handleBlur, onKeyDown: handleKeyDown, className: `bg-zinc-800 border border-zinc-600 rounded px-1 text-center outline-none focus:border-zinc-400 ${className}`, style: { width: '60px', ...style } }));
    }
    return (_jsx("span", { onDoubleClick: handleDoubleClick, className: `cursor-text hover:bg-zinc-800/50 rounded px-1 transition-colors ${className}`, style: style, title: "\u53CC\u51FB\u7F16\u8F91", children: format(value) }));
};
const VectorKnob = ({ value, min, max, step = 0.1, label, unit = '', format, parse, onChange, color, size = 52, disabled = false }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [displayValue, setDisplayValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);
    const lastYRef = useRef(0);
    const valueRef = useRef(value);
    const lastEmittedRef = useRef(value);
    useEffect(() => {
        valueRef.current = value;
        if (!isDragging) {
            setDisplayValue(value);
        }
    }, [value, isDragging]);
    const normalizedValue = (displayValue - min) / (max - min);
    const arcLength = normalizedValue * 270;
    // 更加纤细、激光般的描边
    const strokeW = 2.5;
    const radius = (size / 2) - strokeW - 1;
    const circumference = 2 * Math.PI * radius;
    const arcDash = (270 / 360) * circumference;
    const handleMouseDown = useCallback((e) => {
        if (disabled)
            return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        lastYRef.current = e.clientY;
        lastEmittedRef.current = valueRef.current;
        setDisplayValue(valueRef.current);
        const handleMouseMove = (e) => {
            const deltaY = lastYRef.current - e.clientY;
            lastYRef.current = e.clientY;
            const currentValue = valueRef.current;
            let newValue;
            if (label === 'FREQ') {
                const logMin = Math.log10(min);
                const logMax = Math.log10(max);
                const logValue = Math.log10(currentValue);
                const sensitivity = e.shiftKey ? 0.002 : 0.010;
                const logDelta = deltaY * (logMax - logMin) * sensitivity;
                const newLogValue = Math.max(logMin, Math.min(logMax, logValue + logDelta));
                newValue = Math.round(Math.pow(10, newLogValue));
            }
            else {
                const range = max - min;
                const sensitivity = e.shiftKey ? 0.003 : 0.012;
                const delta = deltaY * range * sensitivity;
                newValue = currentValue + delta;
                newValue = Math.max(min, Math.min(max, newValue));
                newValue = Math.round(newValue / step) * step;
            }
            valueRef.current = newValue;
            setDisplayValue(newValue);
            if (newValue !== lastEmittedRef.current) {
                lastEmittedRef.current = newValue;
                onChange(newValue);
            }
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [min, max, step, onChange, label, disabled]);
    const handleDoubleClick = useCallback(() => {
        if (disabled)
            return;
        const formatted = format ? format(displayValue) : displayValue.toFixed(step < 1 ? 1 : 0);
        setInputValue(formatted.replace(/[^\d.k-]/gi, ''));
        setIsEditing(true);
    }, [disabled, displayValue, format, step]);
    const handleInputBlur = () => {
        setIsEditing(false);
        const parser = parse || parseFloat;
        const parsed = parser(inputValue);
        if (parsed !== null && !isNaN(parsed)) {
            const clamped = Math.max(min, Math.min(max, parsed));
            onChange(clamped);
        }
    };
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter')
            handleInputBlur();
        else if (e.key === 'Escape')
            setIsEditing(false);
    };
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);
    const formattedDisplayValue = format ? format(displayValue) : displayValue.toFixed(step < 1 ? 1 : 0);
    return (_jsxs("div", { className: `flex flex-col items-center select-none ${disabled ? 'opacity-30 pointer-events-none' : ''}`, children: [_jsx("span", { className: "text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5", style: { fontFamily: "'Inter', sans-serif" }, children: label }), _jsx("div", { className: `relative ${disabled ? '' : 'cursor-ns-resize group'}`, style: { width: size, height: size }, onMouseDown: handleMouseDown, children: _jsxs("svg", { width: size, height: size, className: "absolute inset-0 overflow-visible", children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: `knob-track-${label}`, x1: "0%", y1: "0%", x2: "100%", y2: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "rgba(255,255,255,0.08)" }), _jsx("stop", { offset: "100%", stopColor: "rgba(255,255,255,0.03)" })] }), _jsxs("filter", { id: `knob-glow-${label}`, x: "-100%", y: "-100%", width: "300%", height: "300%", children: [_jsx("feGaussianBlur", { stdDeviation: "1.5", result: "blur" }), _jsx("feFlood", { floodColor: color, floodOpacity: "0.5", result: "color" }), _jsx("feComposite", { in: "color", in2: "blur", operator: "in", result: "coloredBlur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "coloredBlur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] })] }), _jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: `url(#knob-track-${label})`, strokeWidth: strokeW, strokeLinecap: "round", strokeDasharray: `${arcDash} ${circumference}`, transform: `rotate(135 ${size / 2} ${size / 2})` }), _jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: color, strokeWidth: strokeW, strokeLinecap: "round", strokeDasharray: `${(arcLength / 360) * circumference} ${circumference}`, transform: `rotate(135 ${size / 2} ${size / 2})`, filter: `url(#knob-glow-${label})`, className: "transition-all duration-75", style: { opacity: 0.9 } }), _jsx("circle", { cx: size / 2 + Math.sin(((-135 + normalizedValue * 270) * Math.PI) / 180) * (radius - 5), cy: size / 2 - Math.cos(((-135 + normalizedValue * 270) * Math.PI) / 180) * (radius - 5), r: 2, fill: color, filter: `url(#knob-glow-${label})`, className: "transition-all duration-75" })] }) }), isEditing ? (_jsx("input", { ref: inputRef, type: "text", value: inputValue, onChange: (e) => setInputValue(e.target.value), onBlur: handleInputBlur, onKeyDown: handleInputKeyDown, className: "w-16 mt-1.5 px-0 py-0.5 text-center text-[11px] font-bold bg-zinc-800/80 border border-zinc-600 rounded outline-none focus:border-zinc-400", style: { fontFamily: "'JetBrains Mono', monospace", color } })) : (_jsxs("span", { onDoubleClick: handleDoubleClick, className: `mt-1.5 text-[11px] font-bold tabular-nums cursor-text px-1.5 py-0.5 rounded transition-all tracking-tight ${isDragging ? 'bg-zinc-800/80' : 'hover:bg-zinc-800/40 text-shadow-sm'}`, style: { fontFamily: "'JetBrains Mono', monospace", color, textShadow: `0 0 10px ${color}40` }, children: [formattedDisplayValue, unit] }))] }));
};
// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════
export const ParametricEQ = ({ bands, onBandsChange, themeColor, selectedCount, selectedSpeakers = [], }) => {
    var _a;
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 600, height: 280 });
    const [selectedBandId, setSelectedBandId] = useState(null);
    const [dragging, setDragging] = useState(null);
    const [dragArmed, setDragArmed] = useState(null);
    const [showTypeMenu, setShowTypeMenu] = useState(false);
    const [showBandMenu, setShowBandMenu] = useState(false);
    const [hoveredBandId, setHoveredBandId] = useState(null);
    const [adjustingBandId, setAdjustingBandId] = useState(null);
    const adjustTimeoutRef = useRef(null);
    const [overviewOrder, setOverviewOrder] = useState([]);
    // 指针当前指向的频率 (用于 X 轴悬浮标签)
    const [pointerFreq, setPointerFreq] = useState(null);
    // 手电筒效果的鼠标位置 (相对于 SVG)
    const [mousePos, setMousePos] = useState(null);
    // 速度感应状态
    const [velocityOpacity, setVelocityOpacity] = useState(1);
    const lastMouseXRef = useRef(0);
    const lastMouseTimeRef = useRef(0);
    const velocityRafRef = useRef();
    // 悬停高亮的频率网格线
    const [hoveredFreq, setHoveredFreq] = useState(null);
    const animatedBands = useAnimatedBands(bands, 200, !!dragging);
    // Measure dimensions
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width, height: rect.height });
            }
        };
        updateDimensions();
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current)
            resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);
    const { width, height } = dimensions;
    // padding 极小，刻度文字嵌入 EQ 区域内部
    const padding = { top: 4, right: 4, bottom: 4, left: 4 };
    const plotWidth = Math.max(0, width - padding.left - padding.right);
    const plotHeight = Math.max(0, height - padding.top - padding.bottom);
    const freqLabelItems = useMemo(() => {
        if (plotWidth <= 0)
            return [];
        // 只使用 LABEL_FREQS 显示刻度文字
        return LABEL_FREQS.map((freq) => {
            const x = padding.left + freqToX(freq, plotWidth);
            const isMajor = [100, 1000, 10000].includes(freq);
            // 计算与指针频率的距离，如果太近则淡出 (避免重叠)
            let opacity = 1;
            if (pointerFreq) {
                // 使用对数距离判断视觉重叠
                const pointerX = padding.left + freqToX(pointerFreq, plotWidth);
                const dist = Math.abs(x - pointerX);
                if (dist < 30) { // 30px 内开始淡出
                    opacity = Math.max(0, (dist - 10) / 20); // 10px 内完全隐藏
                }
            }
            return { freq, x, isMajor, opacity };
        });
    }, [plotWidth, padding.left, pointerFreq]);
    // FabFilter-like dense sub grid (log-spaced), excluding main ticks.
    const denseSubFreqs = useMemo(() => {
        const step = Math.pow(2, 1 / 12); // 1/12 octave
        const majors = new Set(ALL_FREQ_GRID_LINES);
        const items = [];
        let f = MIN_FREQ;
        while (f <= MAX_FREQ) {
            // snap close values to integer to keep stable keys
            const fr = Math.round(f);
            if (!majors.has(fr)) {
                items.push(f);
            }
            f *= step;
        }
        // de-dup near-equal frequencies after rounding
        const out = [];
        let last = -Infinity;
        for (const v of items) {
            if (Math.abs(v - last) > 1)
                out.push(v);
            last = v;
        }
        return out;
    }, []);
    // 增益网格：直接使用每 3dB 的主刻度
    const denseGainLines = useMemo(() => {
        return GAIN_GRID_LINES;
    }, []);
    const edgeFade = useCallback((pos, len) => {
        if (len <= 0)
            return 0;
        const d = Math.min(pos, len - pos);
        // fade zone: ~18% of the half span
        const t = Math.max(0, Math.min(1, d / (len * 0.18)));
        return t * t * (3 - 2 * t); // smoothstep
    }, []);
    // Ghost Point State for Interactive Creation (Phase 14)
    const [ghostPoint, setGhostPoint] = useState(null);
    const getBandColor = useCallback((bandIndex) => {
        return BAND_COLORS[bandIndex % BAND_COLORS.length];
    }, []);
    // 聚光灯效应状态：仅在“真实拖拽”时启用（点击选中不会触发）
    const isSpotlightActive = dragging !== null;
    // 概览模式：按频率从低到高排序（延迟重排，避免调节时卡片跳动）
    const sortedBandIds = useMemo(() => {
        return [...bands]
            .sort((a, b) => a.frequency - b.frequency)
            .map((band) => band.id);
    }, [bands]);
    useEffect(() => {
        setOverviewOrder((prev) => {
            const currentIds = bands.map((band) => band.id);
            const kept = prev.filter((id) => currentIds.includes(id));
            const missing = currentIds.filter((id) => !kept.includes(id));
            if (missing.length === 0 && kept.length === currentIds.length)
                return prev;
            const missingSorted = missing
                .map((id) => bands.find((b) => b.id === id))
                .sort((a, b) => a.frequency - b.frequency)
                .map((b) => b.id);
            return [...kept, ...missingSorted];
        });
    }, [bands]);
    useEffect(() => {
        if (!adjustingBandId) {
            setOverviewOrder(sortedBandIds);
        }
    }, [adjustingBandId, sortedBandIds]);
    const markBandAdjusting = useCallback((bandId) => {
        setAdjustingBandId(bandId);
        if (adjustTimeoutRef.current)
            window.clearTimeout(adjustTimeoutRef.current);
        adjustTimeoutRef.current = window.setTimeout(() => {
            setAdjustingBandId(null);
        }, 500);
    }, []);
    useEffect(() => {
        return () => {
            if (adjustTimeoutRef.current)
                window.clearTimeout(adjustTimeoutRef.current);
        };
    }, []);
    const sortedBandsForOverview = useMemo(() => {
        const byId = new Map(bands.map((band, originalIndex) => [band.id, { band, originalIndex }]));
        const order = (adjustingBandId ? overviewOrder : sortedBandIds);
        const ordered = order.map((id) => byId.get(id)).filter(Boolean);
        // fallback: in case of missing ids
        if (ordered.length !== bands.length) {
            return [...bands]
                .map((band, originalIndex) => ({ band, originalIndex }))
                .sort((a, b) => a.band.frequency - b.band.frequency);
        }
        return ordered;
    }, [bands, overviewOrder, sortedBandIds, adjustingBandId]);
    // Generate paths using animated bands (HP/LP 曲线延伸到画布外)
    const bandPaths = useMemo(() => {
        if (plotWidth <= 0 || plotHeight <= 0)
            return [];
        return animatedBands.map((band, bandIndex) => {
            if (!band.enabled)
                return null;
            const curvePoints = [];
            const areaPoints = [];
            const numPoints = 256;
            const zeroY = padding.top + gainToY(0, plotHeight);
            for (let i = 0; i <= numPoints; i++) {
                const x = (i / numPoints) * plotWidth;
                const freq = xToFreq(x, plotWidth);
                // 不限制增益范围，让 HP/LP 曲线可以延伸到画布外
                const gain = calculateBandResponse(band, freq);
                const y = gainToY(gain, plotHeight);
                const px = padding.left + x;
                const py = padding.top + y;
                curvePoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
                areaPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
            }
            // 填充区域：闭合到 0dB 线
            const areaPath = `${areaPoints.join(' ')} L ${padding.left + plotWidth} ${zeroY} L ${padding.left} ${zeroY} Z`;
            return {
                id: band.id,
                areaPath,
                curvePath: curvePoints.join(' '),
                color: getBandColor(bandIndex),
            };
        }).filter(Boolean);
    }, [animatedBands, plotWidth, plotHeight, padding, getBandColor]);
    // Master Response Curve - 单条总响应曲线 (不限制增益范围)
    const totalCurvePath = useMemo(() => {
        if (plotWidth <= 0 || plotHeight <= 0)
            return '';
        const points = [];
        const numPoints = 512; // 提高精度
        for (let i = 0; i <= numPoints; i++) {
            const x = (i / numPoints) * plotWidth;
            const freq = xToFreq(x, plotWidth);
            const gain = calculateTotalResponse(animatedBands, freq);
            // 不限制 gain，让曲线可以延伸到画布外 (HP/LP 垂直下降)
            const y = gainToY(gain, plotHeight);
            points.push(`${i === 0 ? 'M' : 'L'} ${padding.left + x} ${padding.top + y}`);
        }
        return points.join(' ');
    }, [animatedBands, plotWidth, plotHeight, padding]);
    // Handlers
    const handleMouseDown = useCallback((e, bandId) => {
        e.preventDefault();
        e.stopPropagation();
        // 先进入“拖拽待定”状态，只有发生位移才算拖拽（避免点击选中导致网格低亮）
        setDragArmed({ id: bandId, x: e.clientX, y: e.clientY });
        setSelectedBandId(bandId);
    }, []);
    const handleMouseMove = useCallback((e) => {
        var _a;
        const rect = (_a = svgRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        if (!rect)
            return;
        if (dragArmed && !dragging) {
            const dx = e.clientX - dragArmed.x;
            const dy = e.clientY - dragArmed.y;
            if (Math.hypot(dx, dy) > 2.5) {
                setDragging(dragArmed.id);
                setDragArmed(null);
            }
        }
        const x = e.clientX - rect.left - padding.left;
        const y = e.clientY - rect.top - padding.top;
        const clampedX = Math.max(0, Math.min(plotWidth, x));
        const clampedY = Math.max(0, Math.min(plotHeight, y));
        const freq = xToFreq(clampedX, plotWidth);
        const gain = yToGain(clampedY, plotHeight);
        if (dragging) {
            const band = bands.find(b => b.id === dragging);
            if (!band)
                return;
            // HP/LP 类型锁定 gain 为 0
            const isHpLp = band.type === 'highPass' || band.type === 'lowPass';
            onBandsChange(bands.map(b => {
                if (b.id !== dragging)
                    return b;
                // 限制 gain 在有效范围内 (+/- 24dB)
                const safeGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, Math.round(gain * 10) / 10));
                return {
                    ...b,
                    frequency: e.shiftKey ? b.frequency : Math.round(freq),
                    gain: isHpLp ? 0 : safeGain
                };
            }));
            return;
        }
        // Proximity Detection for Hover
        // 1. Check for direct Node Hover (Distance < 15px) - Highest Priority
        let explicitHoverBandId = null;
        const nodeHoverBound = bands.find(b => {
            const bx = freqToX(b.frequency, plotWidth);
            const by = gainToY(b.gain, plotHeight);
            return Math.hypot(x - bx, y - by) < 15;
        });
        if (nodeHoverBound)
            explicitHoverBandId = nodeHoverBound.id;
        // 2. 仅当接近节点时才高亮
        if (explicitHoverBandId) {
            setHoveredBandId(explicitHoverBandId);
            // 如果直接悬停在节点上，隐藏 pointerFreq 以免遮挡
            if (nodeHoverBound) {
                setPointerFreq(null);
                setGhostPoint(null);
            }
            else {
                setPointerFreq(freq); // 宽范围悬停保留光标
                setGhostPoint(null);
            }
        }
        else {
            setHoveredBandId(null);
            setPointerFreq(freq);
            // Calculate Ghost Point (Phase 14)
            if (!dragging) {
                // 1. Calculate Total Response Gain at this Freq
                let totalGain = 0;
                for (const b of bands) {
                    if (b.enabled) {
                        totalGain += calculateBandResponse(b, freq);
                    }
                }
                const responseY = gainToY(totalGain, plotHeight);
                // y is relative to padding-less area from previous lines: const y = e.clientY - rect.top - padding.top;
                // Wait, let's check 'y' definition in handleMouseMove.
                // Line 923: const y = e.clientY - rect.top - padding.top;
                // gainToY returns Y relative to 0 (top of plot area). 
                // So responseY and y are in the same coordinate system.
                // 2. Check Proximity (Snap to Curve)
                // 增加吸附范围至 30px
                if (Math.abs(y - responseY) < 30) {
                    setGhostPoint({
                        x: x, // relative coord
                        y: responseY,
                        freq: freq,
                        gain: totalGain
                    });
                }
                else {
                    setGhostPoint(null);
                }
            }
            else {
                setGhostPoint(null);
            }
        }
        // 更新手电筒效果的鼠标位置
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        // 计算最近的频率网格线用于悬停高亮
        const mouseFreq = xToFreq(clampedX, plotWidth);
        let nearestFreq = null;
        let minDist = Infinity;
        for (const f of ALL_FREQ_GRID_LINES) {
            const fx = freqToX(f, plotWidth);
            const dist = Math.abs(fx - clampedX);
            if (dist < 20) { // 20px 阈值
                minDist = dist;
                nearestFreq = f;
            }
        }
        // 计算速度感应不透明度 (Motion Blur 模拟)
        const now = performance.now();
        const dt = now - lastMouseTimeRef.current;
        if (dt > 0) {
            const dx = Math.abs(x - lastMouseXRef.current);
            const speed = dx / dt; // pixels per ms
            // 速度阈值: 0.5px/ms (500px/s) 开始淡出，2.0px/ms (2000px/s) 最淡
            // 映射到 1.0 -> 0.2
            const targetOpacity = Math.max(0.2, 1 - Math.max(0, speed - 0.2) * 0.8);
            // 简单的 lerp 平滑，或者直接设置 (为了响应快，直接设置)
            setVelocityOpacity(targetOpacity);
        }
        lastMouseTimeRef.current = now;
        lastMouseXRef.current = x;
        setHoveredFreq(nearestFreq);
        // 停止移动后恢复不透明度 (Debounce restore)
        if (velocityRafRef.current)
            cancelAnimationFrame(velocityRafRef.current);
        const restoreOpacity = () => {
            setVelocityOpacity(prev => {
                if (prev >= 0.98)
                    return 1;
                return prev + (1 - prev) * 0.2; // 渐进恢复
            });
            if (velocityOpacity < 1) {
                velocityRafRef.current = requestAnimationFrame(restoreOpacity);
            }
        };
        // 稍微延迟后开始恢复
        velocityRafRef.current = requestAnimationFrame(restoreOpacity);
    }, [dragArmed, dragging, bands, onBandsChange, plotWidth, plotHeight, padding, velocityOpacity]);
    const handleMouseUp = useCallback(() => {
        setDragging(null);
        setDragArmed(null);
    }, []);
    const handleWheel = useCallback((e, bandId) => {
        e.stopPropagation();
        e.preventDefault();
        const band = bands.find(b => b.id === bandId);
        if (!band)
            return;
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const newQ = Math.max(MIN_Q, Math.min(MAX_Q, band.q * factor));
        onBandsChange(bands.map(b => b.id === bandId ? { ...b, q: newQ } : b));
    }, [bands, onBandsChange]);
    const handleDisplayDoubleClick = useCallback(() => {
        var _a;
        // 双击空白处添加节点: 使用 pointerFreq
        if (!pointerFreq || bands.length >= MAX_BANDS)
            return;
        // 计算当前鼠标对应位置的 gain (从 mouseMove 记录的坐标反推，或者这里简化处理为 0dB)
        // 为了更好的 UX，我们应该记录鼠标 Y 坐标对应的 gain。
        // 由于之前 ghostNode 存了 gain，现在 pointerFreq 没存。
        // 我们可以让 DoubleClick 事件拿到鼠标坐标重新算 gain
        // 但 handleDisplayDoubleClick 是绑在 svg 上的，参数缺 mouse event 坐标
        // 修正：我们重新把 gain 加回状态，或者简单地默认 0dB，或者保留 mousePos 计算。
        // 既然有 mousePos (svg 相对坐标)，可以用它！
        if (!mousePos)
            return;
        // 使用 mousePos 计算 gain
        const rect = (_a = svgRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect(); // 重新拿似乎太慢，直接用 mousePos
        // mousePos 是相对于 svg 左上角的 (e.clientX - rect.left)
        // 需要减去 padding
        const y = mousePos.y - padding.top;
        const clampedY = Math.max(0, Math.min(plotHeight, y));
        const gain = yToGain(clampedY, plotHeight);
        const id = generateId();
        const safeGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, Math.round(gain * 10) / 10));
        const newBand = {
            id,
            enabled: true,
            type: 'peak',
            frequency: Math.round(pointerFreq),
            gain: safeGain,
            q: 1,
        };
        onBandsChange([...bands, newBand]);
        setSelectedBandId(id);
    }, [pointerFreq, mousePos, bands, onBandsChange, padding, plotHeight]);
    const handleRemoveBand = useCallback((bandId) => {
        onBandsChange(bands.filter(b => b.id !== bandId));
        if (selectedBandId === bandId)
            setSelectedBandId(null);
    }, [bands, onBandsChange, selectedBandId]);
    const handleToggleBand = useCallback((bandId) => {
        onBandsChange(bands.map(b => b.id === bandId ? { ...b, enabled: !b.enabled } : b));
    }, [bands, onBandsChange]);
    const handleChangeType = useCallback((bandId, type) => {
        // 切换到 HP/LP 时重置 gain 为 0
        const updates = { type };
        if (type === 'highPass' || type === 'lowPass') {
            updates.gain = 0;
        }
        onBandsChange(bands.map(b => b.id === bandId ? { ...b, ...updates } : b));
        setShowTypeMenu(false);
    }, [bands, onBandsChange]);
    const handleUpdateBand = useCallback((bandId, updates) => {
        onBandsChange(bands.map(b => b.id === bandId ? { ...b, ...updates } : b));
    }, [bands, onBandsChange]);
    const handleSvgClick = useCallback((e) => {
        const target = e.target;
        // 点击背景 rect、网格线、刻度文字、或 SVG 本身时取消选择
        if (target === svgRef.current ||
            target.tagName === 'rect' ||
            target.tagName === 'line' ||
            (target.tagName === 'text' && target.closest('g[data-grid="labels"]') !== null) ||
            target.closest('g[data-grid]') !== null) {
            // 确保不是点击在节点上
            if (target.closest('g[data-band-node]') === null) {
                setSelectedBandId(null);
            }
        }
    }, []);
    const selectedBand = bands.find(b => b.id === selectedBandId);
    const selectedBandAnimated = selectedBandId ? animatedBands.find(b => b.id === selectedBandId) : undefined;
    const selectedBandIndex = selectedBand ? bands.findIndex(b => b.id === selectedBandId) : -1;
    const selectedBandColor = selectedBandIndex >= 0 ? getBandColor(selectedBandIndex) : themeColor;
    const isSelectedHpLp = selectedBand && (selectedBand.type === 'highPass' || selectedBand.type === 'lowPass');
    const isChannelActive = selectedSpeakers.length > 0;
    const getChannelInfo = () => {
        if (selectedSpeakers.length === 0)
            return null;
        if (selectedSpeakers.length === 1) {
            const spk = selectedSpeakers[0];
            return { label: spk, name: SPEAKER_NAMES[spk] || spk, color: SPEAKER_COLORS[spk] || themeColor };
        }
        return { label: `${selectedSpeakers.length}`, name: `Multiple (${selectedSpeakers.length} channels)`, color: themeColor };
    };
    const channelInfo = getChannelInfo();
    return (_jsxs("div", { className: "h-full flex flex-col", children: [_jsx("div", { className: "flex items-center justify-between mb-3 shrink-0", children: _jsx("h3", { className: "text-[11px] font-bold text-zinc-400 uppercase tracking-wider", children: "Parametric EQ" }) }), _jsxs("div", { className: "flex-1 flex flex-col min-h-0 bg-zinc-900/40 rounded-xl border border-zinc-700/50 overflow-hidden", children: [_jsxs("div", { ref: containerRef, className: "flex-1 min-h-0 relative group", children: [channelInfo && (_jsx("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in slide-in-from-top duration-300 fade-in", children: _jsxs("div", { className: "flex items-center gap-3 px-4 py-1.5 rounded-b-xl border-x border-b border-zinc-700/60 bg-zinc-900/95 backdrop-blur-xl shadow-lg shadow-black/20", children: [_jsx("div", { className: "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", style: { backgroundColor: channelInfo.color, color: channelInfo.color } }), _jsx("span", { className: "text-xs font-bold tracking-wide text-zinc-100", children: channelInfo.label }), _jsx("div", { className: "w-px h-3 bg-zinc-700/50" }), _jsx("span", { className: "text-[10px] font-medium text-zinc-400 uppercase tracking-wider", children: channelInfo.name })] }) }, `${channelInfo.label}-${channelInfo.name}`)), _jsxs("svg", { ref: svgRef, className: "w-full h-full transition-all duration-700 ease-in-out", onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, onMouseLeave: () => { handleMouseUp(); setPointerFreq(null); setHoveredBandId(null); setMousePos(null); }, onDoubleClick: handleDisplayDoubleClick, onClick: handleSvgClick, style: {
                                    cursor: dragging ? 'none' : 'default',
                                    pointerEvents: isChannelActive ? 'auto' : 'none',
                                    opacity: isChannelActive ? 1 : 0.4,
                                    filter: isChannelActive ? 'none' : 'saturate(30%) blur(1px)'
                                }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "bgGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#18181b", stopOpacity: "0.35" }), _jsx("stop", { offset: "100%", stopColor: "#18181b", stopOpacity: "0.25" })] }), _jsxs("linearGradient", { id: "bgFadeLeft", x1: "0", y1: "0", x2: "1", y2: "0", children: [_jsx("stop", { offset: "0%", stopColor: "black", stopOpacity: "1" }), _jsx("stop", { offset: "100%", stopColor: "white", stopOpacity: "1" })] }), _jsxs("linearGradient", { id: "bgFadeRight", x1: "1", y1: "0", x2: "0", y2: "0", children: [_jsx("stop", { offset: "0%", stopColor: "black", stopOpacity: "1" }), _jsx("stop", { offset: "100%", stopColor: "white", stopOpacity: "1" })] }), _jsxs("linearGradient", { id: "bgFadeTop", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "black", stopOpacity: "1" }), _jsx("stop", { offset: "100%", stopColor: "white", stopOpacity: "1" })] }), _jsxs("linearGradient", { id: "bgFadeBottom", x1: "0", y1: "1", x2: "0", y2: "0", children: [_jsx("stop", { offset: "0%", stopColor: "black", stopOpacity: "1" }), _jsx("stop", { offset: "100%", stopColor: "white", stopOpacity: "1" })] }), _jsxs("mask", { id: "bgFadeMask", children: [_jsx("rect", { x: padding.left, y: padding.top, width: plotWidth, height: plotHeight, fill: "white" }), _jsx("rect", { x: padding.left, y: padding.top, width: 60, height: plotHeight, fill: "url(#bgFadeLeft)" }), _jsx("rect", { x: padding.left + plotWidth - 60, y: padding.top, width: 60, height: plotHeight, fill: "url(#bgFadeRight)" }), _jsx("rect", { x: padding.left, y: padding.top, width: plotWidth, height: 30, fill: "url(#bgFadeTop)" }), _jsx("rect", { x: padding.left, y: padding.top + plotHeight - 50, width: plotWidth, height: 50, fill: "url(#bgFadeBottom)" })] }), _jsxs("linearGradient", { id: "fadeLeft", x1: "0", y1: "0", x2: "1", y2: "0", children: [_jsx("stop", { offset: "0%", stopColor: "black" }), _jsx("stop", { offset: "100%", stopColor: "white" })] }), _jsxs("linearGradient", { id: "fadeRight", x1: "1", y1: "0", x2: "0", y2: "0", children: [_jsx("stop", { offset: "0%", stopColor: "black" }), _jsx("stop", { offset: "100%", stopColor: "white" })] }), _jsxs("linearGradient", { id: "fadeTop", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "black" }), _jsx("stop", { offset: "100%", stopColor: "white" })] }), _jsxs("linearGradient", { id: "fadeBottom", x1: "0", y1: "1", x2: "0", y2: "0", children: [_jsx("stop", { offset: "0%", stopColor: "black" }), _jsx("stop", { offset: "100%", stopColor: "white" })] }), _jsxs("radialGradient", { id: "fadeCornerTL", cx: "0%", cy: "0%", r: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "black" }), _jsx("stop", { offset: "100%", stopColor: "white" })] }), _jsxs("radialGradient", { id: "fadeCornerTR", cx: "100%", cy: "0%", r: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "black" }), _jsx("stop", { offset: "100%", stopColor: "white" })] }), _jsxs("radialGradient", { id: "fadeCornerBL", cx: "0%", cy: "100%", r: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "black" }), _jsx("stop", { offset: "100%", stopColor: "white" })] }), _jsxs("radialGradient", { id: "fadeCornerBR", cx: "100%", cy: "100%", r: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "black" }), _jsx("stop", { offset: "100%", stopColor: "white" })] }), _jsxs("mask", { id: "gridFadeMask", children: [_jsx("rect", { x: padding.left, y: padding.top, width: plotWidth, height: plotHeight, fill: "white" }), _jsx("rect", { x: padding.left, y: padding.top, width: 80, height: plotHeight, fill: "url(#fadeLeft)" }), _jsx("rect", { x: padding.left + plotWidth - 80, y: padding.top, width: 80, height: plotHeight, fill: "url(#fadeRight)" }), _jsx("rect", { x: padding.left, y: padding.top, width: plotWidth, height: 60, fill: "url(#fadeTop)" }), _jsx("rect", { x: padding.left, y: padding.top + plotHeight - 80, width: plotWidth, height: 80, fill: "url(#fadeBottom)" })] }), bands.map((band, idx) => {
                                                const color = getBandColor(idx);
                                                const isSelected = selectedBandId === band.id;
                                                return (_jsxs(React.Fragment, { children: [_jsxs("filter", { id: `glow-${band.id}`, x: "-50%", y: "-50%", width: "200%", height: "200%", children: [_jsx("feGaussianBlur", { stdDeviation: "0.8", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }), _jsxs("filter", { id: `glow-strong-${band.id}`, x: "-50%", y: "-50%", width: "200%", height: "200%", children: [_jsx("feGaussianBlur", { stdDeviation: "1.5", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }), _jsx("linearGradient", { id: `bandGradient-${band.id}`, x1: "0", y1: "0", x2: "0", y2: "1", children: (() => {
                                                                const isBoost = band.gain >= 0;
                                                                // Polarity Aware Gradient Logic:
                                                                // Boost (Peak at bottom relative to SVG coords? Wait. y=0 is top. gain>0 is above center.)
                                                                // We need to know coordinate system. 
                                                                // 0dB is at Center Y. Positive Gain is Y < Center. Negative Gain is Y > Center.
                                                                // LinearGradient y1=0 (Top of bbox), y2=1 (Bottom of bbox).
                                                                // For a Boost Curve: Bbox top is Peak, Bbox bottom is 0dB line. 
                                                                // -> We want Peak (Top/0%) to be High Opacity, 0dB (Bottom/100%) to be Low Opacity.
                                                                // For a Cut Curve: Bbox top is 0dB line, Bbox bottom is Valley/Peak.
                                                                // -> We want 0dB (Top/0%) to be Low Opacity, Peak (Bottom/100%) to be High Opacity.
                                                                const isSelected = selectedBandId === band.id;
                                                                if (isSelected) {
                                                                    // 选中状态: 光柱 (Beam)
                                                                    if (isBoost) {
                                                                        return (_jsxs(_Fragment, { children: [_jsx("stop", { offset: "0%", stopColor: color, stopOpacity: 0.65 }), " ", _jsx("stop", { offset: "30%", stopColor: color, stopOpacity: 0.4 }), _jsx("stop", { offset: "100%", stopColor: color, stopOpacity: 0.05 }), " "] }));
                                                                    }
                                                                    else {
                                                                        // Cut
                                                                        return (_jsxs(_Fragment, { children: [_jsx("stop", { offset: "0%", stopColor: color, stopOpacity: 0.05 }), " ", _jsx("stop", { offset: "70%", stopColor: color, stopOpacity: 0.4 }), _jsx("stop", { offset: "100%", stopColor: color, stopOpacity: 0.65 }), " "] }));
                                                                    }
                                                                }
                                                                else {
                                                                    // 静默/悬停状态: 简单渐变
                                                                    if (isBoost) {
                                                                        return (_jsxs(_Fragment, { children: [_jsx("stop", { offset: "0%", stopColor: color, stopOpacity: 0.8 }), _jsx("stop", { offset: "100%", stopColor: color, stopOpacity: 0.0 })] }));
                                                                    }
                                                                    else {
                                                                        return (_jsxs(_Fragment, { children: [_jsx("stop", { offset: "0%", stopColor: color, stopOpacity: 0.0 }), _jsx("stop", { offset: "100%", stopColor: color, stopOpacity: 0.8 })] }));
                                                                    }
                                                                }
                                                            })() })] }, `filters-${band.id}`));
                                            }), _jsxs("filter", { id: "glow-total", x: "-50%", y: "-50%", width: "200%", height: "200%", children: [_jsx("feGaussianBlur", { stdDeviation: "1.5", result: "blur" }), " ", _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }), _jsxs("filter", { id: "glow-node", x: "-100%", y: "-100%", width: "300%", height: "300%", children: [_jsx("feGaussianBlur", { stdDeviation: "0.6", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }), _jsxs("filter", { id: "glow-ring", x: "-100%", y: "-100%", width: "300%", height: "300%", children: [_jsx("feGaussianBlur", { stdDeviation: "2", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }), mousePos && (_jsxs("radialGradient", { id: "flashlightGradient", cx: mousePos.x, cy: mousePos.y, r: "120", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { offset: "0%", stopColor: "white", stopOpacity: "1" }), _jsx("stop", { offset: "60%", stopColor: "white", stopOpacity: "0.3" }), _jsx("stop", { offset: "100%", stopColor: "black", stopOpacity: "0" })] })), _jsx("mask", { id: "flashlightMask", children: mousePos ? (_jsx("rect", { x: padding.left, y: padding.top, width: plotWidth, height: plotHeight, fill: "url(#flashlightGradient)" })) : (_jsx("rect", { x: padding.left, y: padding.top, width: plotWidth, height: plotHeight, fill: "black" })) })] }), _jsx("rect", { x: padding.left, y: padding.top, width: plotWidth, height: plotHeight, fill: "url(#bgGradient)", mask: "url(#bgFadeMask)" }), _jsxs("g", { "data-grid": "lines", mask: "url(#gridFadeMask)", children: [(() => {
                                                const hoveredIndex = hoveredFreq ? ALL_FREQ_GRID_LINES.indexOf(hoveredFreq) : -1;
                                                return ALL_FREQ_GRID_LINES.map((freq, index) => {
                                                    const x = padding.left + freqToX(freq, plotWidth);
                                                    const isMajor = LOG_MAJOR_FREQS.includes(freq);
                                                    const fadeX = edgeFade(x - padding.left, plotWidth);
                                                    const isHovered = hoveredFreq === freq;
                                                    // 临近线高亮
                                                    let highlightStrength = 0;
                                                    if (hoveredIndex !== -1) {
                                                        const dist = Math.abs(index - hoveredIndex);
                                                        if (dist === 0)
                                                            highlightStrength = 1.0;
                                                        else if (dist === 1)
                                                            highlightStrength = 0.5;
                                                        else if (dist === 2)
                                                            highlightStrength = 0.2;
                                                        else if (dist === 3)
                                                            highlightStrength = 0.05;
                                                    }
                                                    // 基础样式 - 频率次线提亮 (Phase 10: 增强静默状态清晰度)
                                                    const baseOpacity = isMajor ? 0.45 : 0.25; // 次线 0.18 -> 0.25
                                                    const baseColor = isMajor ? '#d4d4d8' : '#52525b'; // Zinc-300 / Zinc-600
                                                    const highlightColor = '#a1a1aa'; // Zinc-400
                                                    const highlightOpacity = 0.50;
                                                    const strokeColor = highlightStrength > 0.1 ? highlightColor : baseColor;
                                                    const finalOpacity = (baseOpacity + (highlightOpacity - baseOpacity) * highlightStrength) * fadeX;
                                                    const strokeW = isMajor ? 0.6 : 0.22; // 主线更粗
                                                    return (_jsx("line", { x1: x, y1: padding.top, x2: x, y2: padding.top + plotHeight, stroke: strokeColor, strokeWidth: strokeW, opacity: finalOpacity, style: { transition: 'all 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' } }, `line-x-${freq}`));
                                                });
                                            })(), denseGainLines.filter(g => Math.abs(g) > 1e-6).map((gain) => {
                                                const y = padding.top + gainToY(gain, plotHeight);
                                                const fadeY = edgeFade(y - padding.top, plotHeight);
                                                const isMajor = Math.abs(gain % 6) < 1e-6;
                                                // 匹配垂直网格的层级 - 增益线压暗
                                                const stroke = isMajor ? '#a1a1aa' : '#3f3f46'; // Zinc-400 / Zinc-700
                                                const baseOpacity = isMajor ? 0.22 : 0.05;
                                                const sw = isMajor ? 0.5 : 0.2;
                                                return (_jsx("line", { x1: padding.left, y1: y, x2: padding.left + plotWidth, y2: y, stroke: stroke, strokeWidth: sw, opacity: baseOpacity * fadeY }, `line-y-${gain}`));
                                            }), (() => {
                                                const y = padding.top + gainToY(0, plotHeight);
                                                const fadeY = edgeFade(y - padding.top, plotHeight);
                                                return (_jsx("line", { x1: padding.left, y1: y, x2: padding.left + plotWidth, y2: y, stroke: "#fcd34d" // 琥珀黄 (Amber-300)
                                                    , strokeWidth: 0.5, opacity: 0.55 * fadeY }, "line-y-0db"));
                                            })()] }), _jsxs("g", { "data-grid": "highlight", mask: "url(#flashlightMask)", style: { transition: 'opacity 300ms ease' }, children: [ALL_FREQ_GRID_LINES.map((freq) => {
                                                const x = padding.left + freqToX(freq, plotWidth);
                                                const isMajor = LOG_MAJOR_FREQS.includes(freq);
                                                return (_jsx("line", { x1: x, y1: padding.top, x2: x, y2: padding.top + plotHeight, stroke: isMajor ? '#d4d4d8' : '#71717a', strokeWidth: isMajor ? 0.6 : 0.22, opacity: isMajor ? 0.40 : 0.18 }, `hl-x-${freq}`));
                                            }), denseGainLines.map((gain) => {
                                                const y = padding.top + gainToY(gain, plotHeight);
                                                const isZero = Math.abs(gain) < 1e-6;
                                                const isMajor = Math.abs(gain % 6) < 1e-6;
                                                return (_jsx("line", { x1: padding.left, y1: y, x2: padding.left + plotWidth, y2: y, stroke: isZero ? '#a1a1aa' : '#52525b', strokeWidth: isZero ? 0.5 : 0.2, opacity: isZero ? 0.25 : 0.08 }, `hl-y-${gain}`));
                                            })] }), _jsxs("g", { "data-grid": "labels", children: [freqLabelItems.map(({ freq, x, isMajor, opacity }) => {
                                                // 计算与 pointerFreq 的动态距离遮罩
                                                let dynamicOpacity = opacity;
                                                if (pointerFreq) {
                                                    const pointerX = padding.left + freqToX(pointerFreq, plotWidth);
                                                    const dist = Math.abs(x - pointerX);
                                                    // 50px 范围开始淡出，20px 内完全隐藏 - 更宽的呼吸感
                                                    if (dist < 45) {
                                                        const t = Math.max(0, (dist - 15) / 30);
                                                        // 平滑曲线 (Smoothstep)
                                                        const smoothT = t * t * (3 - 2 * t);
                                                        dynamicOpacity *= smoothT;
                                                    }
                                                }
                                                // 判断是否接近选中频点
                                                const isNearSelected = selectedBandAnimated && !pointerFreq &&
                                                    Math.abs(Math.log10(freq) - Math.log10(selectedBandAnimated.frequency)) < 0.15;
                                                // 鼠标悬停时，整体静态刻度稍微压暗，突出动态值
                                                const activeDim = pointerFreq ? 0.6 : 1;
                                                return (_jsx("text", { x: x, y: padding.top + plotHeight - 8, fill: isNearSelected ? selectedBandColor : (isMajor ? '#e4e4e7' : '#a1a1aa'), fontSize: "10", fontWeight: isMajor ? '600' : '500', textAnchor: "middle", dominantBaseline: "auto", fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif", style: {
                                                        letterSpacing: '0.01em',
                                                        opacity: dynamicOpacity * activeDim, // 动态透明度
                                                        transition: 'opacity 0.15s ease-out, fill 0.2s ease',
                                                        textShadow: isMajor ? '0 0 10px rgba(0,0,0,0.5)' : 'none'
                                                    }, children: formatFreq(freq) }, `label-x-${freq}`));
                                            }), pointerFreq && (_jsx("g", { transform: `translate(${padding.left + freqToX(pointerFreq, plotWidth)}, ${padding.top + plotHeight - 8})`, style: { transition: 'transform 0.06s linear' }, children: (() => {
                                                    let cursorColor = '#e4e4e7'; // 默认 Zinc-200 (白)
                                                    if (dragging) {
                                                        const b = bands.find(b => b.id === dragging);
                                                        if (b)
                                                            cursorColor = getBandColor(bands.indexOf(b));
                                                    }
                                                    else if (selectedBandId) {
                                                        cursorColor = selectedBandColor;
                                                    }
                                                    else if (hoveredBandId) {
                                                        const b = bands.find(b => b.id === hoveredBandId);
                                                        if (b)
                                                            cursorColor = getBandColor(bands.indexOf(b));
                                                    }
                                                    return (_jsxs(_Fragment, { children: [_jsx("text", { x: "0", y: "0", fill: "#ffffff", fontSize: "10", fontWeight: "700", textAnchor: "middle", dominantBaseline: "auto", fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif", style: {
                                                                    // 降低辉光强度: 8px->4px, 15px->10px，透明度降低
                                                                    textShadow: `0 0 4px ${cursorColor}40, 0 0 10px ${cursorColor}20`,
                                                                    // 移除过重的 drop-shadow，只保留轻微的背景分离感
                                                                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))',
                                                                    letterSpacing: '0.01em',
                                                                    opacity: velocityOpacity,
                                                                    transition: 'opacity 0.1s ease, text-shadow 0.2s ease'
                                                                }, children: Math.round(pointerFreq) }), _jsx("line", { x1: "0", y1: "-16", x2: "0", y2: "-12", stroke: cursorColor, strokeWidth: "1.5", strokeLinecap: "round", opacity: 0.9 * velocityOpacity, style: {
                                                                    filter: `drop-shadow(0 0 3px ${cursorColor})`, // 降低光晕半径 4px->3px
                                                                    transition: 'stroke 0.2s ease, opacity 0.1s ease'
                                                                } })] }));
                                                })() })), [...new Set([
                                                    ...GAIN_GRID_LINES.filter(gain => gain % 6 === 0), // 0, +/-6, +/-12, +/-18, +/-24
                                                ])].sort((a, b) => b - a).map(gain => {
                                                const rawY = padding.top + gainToY(gain, plotHeight);
                                                const y = Math.max(padding.top + 10, Math.min(padding.top + plotHeight - 26, rawY));
                                                const isZero = gain === 0;
                                                // 判断是否接近选中频点的增益
                                                const isNearSelected = selectedBandAnimated &&
                                                    Math.abs(gain - selectedBandAnimated.gain) < 1.5;
                                                return (_jsx("text", { x: padding.left + 10, y: y, fill: isNearSelected ? selectedBandColor : (isZero ? '#d4d4d8' : '#a1a1aa'), fontSize: "10", fontWeight: isZero ? '600' : '500', textAnchor: "start", dominantBaseline: "middle", fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif", style: { letterSpacing: '0.01em' }, className: "transition-colors duration-150", children: gain > 0 ? `+${gain}` : gain }, `label-y-${gain}`));
                                            })] }), _jsx("g", { style: { isolation: 'isolate' }, children: bandPaths.map(({ id, areaPath, color }) => {
                                            const isActive = hoveredBandId === id || dragging === id || selectedBandId === id;
                                            const dimmed = isSpotlightActive && dragging !== id;
                                            // 沉浸式交互 (Phase 11):
                                            // 静默: 近乎不可见 (0.02)
                                            // 悬停: 明显但克制 (0.25)
                                            // 选中: 强 (0.8)
                                            let targetOpacity = 0.02; // 默认极低
                                            let saturation = '0%'; // 默认无色
                                            if (isActive) {
                                                // 区分悬停和选中
                                                if (selectedBandId === id || dragging === id) {
                                                    targetOpacity = 0.8; // 选中/拖拽: 高亮
                                                    saturation = '100%';
                                                }
                                                else {
                                                    targetOpacity = 0.25; // 仅悬停: 中低亮度
                                                    saturation = '90%';
                                                }
                                            }
                                            if (dimmed) {
                                                targetOpacity = 0.01;
                                                saturation = '0%';
                                            }
                                            return (_jsx("path", { d: areaPath, fill: `url(#bandGradient-${id})`, fillOpacity: targetOpacity, style: {
                                                    mixBlendMode: 'screen',
                                                    filter: `saturate(${saturation})`, // 动态饱和度
                                                    transition: 'fill-opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), filter 0.25s ease'
                                                } }, `fill-${id}`));
                                        }) }), bandPaths.map(({ id, curvePath, color }) => {
                                        const isActive = hoveredBandId === id || dragging === id || selectedBandId === id;
                                        const dimmed = isSpotlightActive && dragging !== id;
                                        const noFocus = !selectedBandId && !hoveredBandId && !dragging;
                                        const hasFocus = !noFocus;
                                        // 提升可见度 (Phase 12): 静默 0.65, 激活 1.0
                                        const opacity = isActive ? 1.0 : (dimmed ? 0.15 : (hasFocus ? 0.25 : 0.35));
                                        return (_jsx("path", { d: curvePath, fill: "none", stroke: color, strokeWidth: isActive ? 2.0 : 1.2, strokeLinecap: "round", opacity: opacity, 
                                            // filter={isActive ? `url(#glow-${id})` : undefined} // 移除光晕，追求锐利
                                            style: {
                                                transition: 'opacity 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease',
                                                filter: isActive ? 'saturate(100%)' : (hasFocus ? 'saturate(35%)' : 'saturate(55%)')
                                            } }, `band-curve-${id}`));
                                    }), (() => {
                                        const zeroY = padding.top + gainToY(0, plotHeight);
                                        const fallbackPath = `M ${padding.left} ${zeroY} L ${padding.left + plotWidth} ${zeroY}`;
                                        const finalPath = (bands.length > 0 && totalCurvePath) ? totalCurvePath : fallbackPath;
                                        const showCurve = bands.length > 0 || true; // Always show now
                                        if (!showCurve)
                                            return null;
                                        return (_jsxs(_Fragment, { children: [_jsx("path", { d: finalPath, fill: "none", stroke: "#FBBF24" // Amber-400
                                                    , strokeWidth: "5" // 宽光晕
                                                    , strokeLinecap: "round", strokeLinejoin: "round", opacity: bands.length === 0 ? 0.4 : 0.25, style: {
                                                        mixBlendMode: 'screen',
                                                        filter: 'blur(1px)',
                                                        transition: 'opacity 0.5s ease',
                                                        animation: bands.length === 0 ? 'breathe 3s infinite' : 'none'
                                                    } }), _jsx("path", { d: totalCurvePath, fill: "none", stroke: "#FCD34D" // Amber-300
                                                    , strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", opacity: 0.6 }), _jsx("path", { d: totalCurvePath, fill: "none", stroke: "#FFFBEB" // Amber-50 (近乎白)
                                                    , strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round", opacity: 0.95 })] }));
                                    })(), "\\n", bands.map((band, idx) => {
                                        const animBand = animatedBands[idx] || band;
                                        const x = padding.left + freqToX(animBand.frequency, plotWidth);
                                        const y = padding.top + gainToY(animBand.gain, plotHeight);
                                        const isSelected = band.id === selectedBandId;
                                        const isHovered = hoveredBandId === band.id;
                                        const color = getBandColor(idx);
                                        const dimmed = isSpotlightActive && dragging !== band.id;
                                        const isActive = isSelected || isHovered;
                                        return (_jsxs("g", { "data-band-node": band.id, transform: `translate(${x}, ${y})`, onMouseDown: (e) => handleMouseDown(e, band.id), onWheel: (e) => handleWheel(e, band.id), style: { cursor: 'grab', opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.15s ease' }, children: [_jsx("circle", { r: 20, fill: "transparent" }), isSelected && (_jsxs(_Fragment, { children: [_jsx("circle", { r: 18, fill: color, opacity: 0.18, filter: "url(#glow-ring)" }), _jsx("circle", { r: 12, fill: "none", stroke: color, strokeWidth: 1.5, opacity: 0.55 }), _jsx("circle", { r: 8, fill: color, opacity: 0.08 })] })), isHovered && !isSelected && (_jsx("circle", { r: 10, fill: "none", stroke: color, strokeWidth: 1, opacity: 0.40 })), _jsx("circle", { r: isActive ? 6 : 5, fill: "rgba(0,0,0,0.4)", transform: "translate(0.5, 1)" }), _jsx("circle", { r: isActive ? 6 : 5, fill: color, filter: isActive ? "url(#glow-node)" : undefined, opacity: 1 }), _jsx("circle", { r: isActive ? 3.5 : 2.5, fill: "rgba(255,255,255,0.35)", transform: `translate(${isActive ? -1 : -0.8}, ${isActive ? -1.5 : -1})` }), _jsx("circle", { r: isActive ? 6 : 5, fill: "none", stroke: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', strokeWidth: isActive ? 1.2 : 0.8, className: "transition-all duration-100" })] }, band.id));
                                    }), ghostPoint && !dragging && (_jsxs("g", { transform: `translate(${padding.left + ghostPoint.x}, ${padding.top + ghostPoint.y})`, style: { pointerEvents: 'auto', cursor: 'pointer' }, onClick: (e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            // Instant Create
                                            const id = generateId();
                                            const newBand = {
                                                id, enabled: true, type: 'peak',
                                                frequency: Math.round(ghostPoint.freq),
                                                gain: parseFloat(ghostPoint.gain.toFixed(1)),
                                                q: 1
                                            };
                                            onBandsChange([...bands, newBand]);
                                            setSelectedBandId(id);
                                            setGhostPoint(null);
                                        }, children: [_jsx("circle", { r: 6, fill: "rgba(255,255,255,0.3)", className: "animate-pulse" }), _jsx("circle", { r: 3, fill: "white" }), _jsx("text", { y: -12, textAnchor: "middle", fill: "white", fontSize: "9", fontFamily: "monospace", opacity: 0.8, style: { textShadow: '0 0 4px rgba(0,0,0,0.5)' }, children: "+" })] })), bands.length === 0 && (
                                    // 添加 CSS Keyframes for breathing
                                    _jsx("style", { children: `
                 @keyframes breathe {
                   0% { opacity: 0.2; stroke-width: 4px; }
                   50% { opacity: 0.5; stroke-width: 6px; }
                   100% { opacity: 0.2; stroke-width: 4px; }
                 }
                 ` }))] }), !isChannelActive && (_jsxs("div", { className: "absolute inset-0 z-30 flex items-center justify-center pointer-events-none overflow-hidden animate-in fade-in duration-700", children: [_jsx("div", { className: "absolute inset-0 bg-zinc-950/10 backdrop-blur-[2px]" }), _jsxs("div", { className: "relative px-6 py-3 rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center gap-3 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-700", children: [_jsx("div", { className: "w-1.5 h-1.5 rounded-full bg-zinc-500/50 animate-pulse" }), _jsx("span", { className: "text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400/80", children: "Select a channel to enable EQ" }), _jsx("div", { className: "w-1.5 h-1.5 rounded-full bg-zinc-500/50 animate-pulse" })] })] }))] }), _jsx("div", { className: "shrink-0 h-[108px] relative flex items-center justify-between transition-all duration-700 ease-in-out overflow-hidden", style: selectedBand || bands.length > 0 ? {
                            background: `linear-gradient(to top, rgba(15,15,18,0.95) 0%, rgba(18,18,22,0.85) 60%, rgba(24,24,28,0.7) 100%)`,
                            backdropFilter: 'blur(16px)',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -10px 30px rgba(0,0,0,0.3), 0 -4px 12px rgba(0,0,0,0.2)`,
                            opacity: isChannelActive ? 1 : 0.4,
                            pointerEvents: isChannelActive ? 'auto' : 'none',
                            filter: isChannelActive ? 'none' : 'saturate(30%)'
                        } : {
                            background: 'rgba(12,12,15,0.6)',
                            backdropFilter: 'blur(8px)',
                            borderTop: '1px solid rgba(255,255,255,0.03)',
                            opacity: 0.5,
                            pointerEvents: 'none',
                        }, children: selectedBand ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-4 pl-6", children: [_jsx("button", { onClick: () => handleToggleBand(selectedBand.id), className: `w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${selectedBand.enabled
                                                ? 'bg-white/5 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                                : 'bg-transparent text-zinc-600 hover:text-zinc-400'}`, style: selectedBand.enabled ? { color: selectedBandColor, boxShadow: `0 0 15px ${selectedBandColor}25` } : {}, title: selectedBand.enabled ? 'Disable Band' : 'Enable Band', children: _jsx(Power, { size: 18, strokeWidth: 2.5 }) }), _jsxs("div", { className: "relative group/type", children: [_jsxs("button", { onClick: () => {
                                                        setShowTypeMenu(!showTypeMenu);
                                                        setShowBandMenu(false);
                                                    }, className: "flex items-center gap-2 h-8 pl-3 pr-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5", children: [_jsx("span", { className: "text-[11px] font-bold tracking-wider", style: { fontFamily: "'JetBrains Mono', monospace", color: selectedBandColor }, children: (_a = FILTER_TYPES.find(t => t.value === selectedBand.type)) === null || _a === void 0 ? void 0 : _a.label.toUpperCase() }), _jsx(ChevronDown, { size: 12, className: "text-zinc-500 group-hover/type:text-zinc-300 transition-colors" })] }), showTypeMenu && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-[100]", onClick: () => setShowTypeMenu(false) }), _jsx("div", { className: "absolute bottom-full left-0 mb-2 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-zinc-800/80 shadow-2xl z-[101] overflow-hidden min-w-[120px]", children: FILTER_TYPES.map(type => (_jsx("button", { onClick: () => handleChangeType(selectedBand.id, type.value), className: `flex items-center gap-2 w-full px-4 py-2 transition-colors text-left text-[11px] font-medium tracking-wide ${selectedBand.type === type.value ? 'bg-white/10' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`, style: selectedBand.type === type.value ? { color: selectedBandColor } : {}, children: type.label }, type.value))) })] }))] })] }), _jsxs("div", { className: "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8", children: [_jsx(VectorKnob, { value: selectedBand.frequency, min: MIN_FREQ, max: MAX_FREQ, step: 1, label: "FREQ", format: formatFreqFull, parse: parseFreqInput, onChange: (v) => handleUpdateBand(selectedBand.id, { frequency: v }), color: selectedBandColor, size: 46 }), !isSelectedHpLp && (_jsx(VectorKnob, { value: selectedBand.gain, min: MIN_GAIN, max: MAX_GAIN, step: 0.1, label: "GAIN", unit: "dB", format: (v) => (v > 0 ? '+' : '') + v.toFixed(1), onChange: (v) => handleUpdateBand(selectedBand.id, { gain: v }), color: selectedBandColor, size: 54 })), _jsx(VectorKnob, { value: selectedBand.q, min: MIN_Q, max: MAX_Q, step: 0.01, label: "Q", format: (v) => v.toFixed(2), onChange: (v) => handleUpdateBand(selectedBand.id, { q: v }), color: selectedBandColor, size: 46 })] }), _jsx("div", { className: "flex items-center justify-end pr-6", children: _jsx("button", { onClick: () => handleRemoveBand(selectedBand.id), className: "w-10 h-10 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200", title: "Remove Band", children: _jsx(Trash2, { size: 16 }) }) })] })) : (
                        // 参数总览模式 (Overview Mode) - 按频率排序，溢出时水平滚动
                        _jsx("div", { className: "w-full h-full overflow-x-auto overflow-y-hidden px-4 flex items-center scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent", children: bands.length === 0 ? (_jsx("span", { className: "text-zinc-600 text-xs font-medium tracking-wide mx-auto", children: "Double click on graph to add band" })) : (_jsx("div", { className: "flex items-center gap-2 mx-auto py-2", children: sortedBandsForOverview.map(({ band, originalIndex }) => (_jsx(BandOverviewCard, { band: band, index: originalIndex, color: getBandColor(originalIndex), isSelected: selectedBandId === band.id, isHovered: hoveredBandId === band.id, isAdjusting: adjustingBandId === band.id, onClick: () => setSelectedBandId(band.id), onMouseEnter: () => setHoveredBandId(band.id), onMouseLeave: () => setHoveredBandId(null), onUpdate: handleUpdateBand, onAdjust: markBandAdjusting }, band.id))) })) })) })] })] }));
};
export default ParametricEQ;
