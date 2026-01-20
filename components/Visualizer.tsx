import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, ShieldAlert, ChevronDown, Check, Play, Square, RotateCw, MoreHorizontal } from 'lucide-react';
import { Speaker } from '../types';

interface VisualizerProps {
    speakers: Speaker[];
    active: boolean;
    context?: 'SOURCE' | 'OUTPUT';
    onContextChange?: (ctx: 'SOURCE' | 'OUTPUT') => void;
    formatLabel?: string;
    speakerOverrides?: Record<string, { color?: string; ring?: string; opacity?: number }>;
    onSpeakerClick?: (id: string, mode: 'SOLO' | 'MUTE') => void;
    onCleanAll?: () => void; // Sync reset
    variant?: 'default' | 'editor'; // Controls UI layout
    themeColor?: string; // Dynamic theme color (HEX)
    highlightedId?: string | null; // External highlight control
}

// Speaker Group Definitions
// Speaker Group Definitions
const GROUPS: Record<string, string[]> = {
    'Front': ['L', 'C', 'R'],
    'Wide': ['Lw', 'Rw'],
    'Surround': ['Ls', 'Rs'],
    'Rear': ['Lrs', 'Rrs'],
    'Top': ['Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'],
    'Sub': ['LFE']
};

interface FadingBox {
    id: string;
    left: number;
    top: number;
    width: number;
    height: number;
}

export const Visualizer: React.FC<VisualizerProps> = ({ speakers, active, context = 'SOURCE', onContextChange, formatLabel = '9.1.6', speakerOverrides, onSpeakerClick, onCleanAll, variant = 'default', themeColor = '#06b6d4', highlightedId }) => {
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [individualSelection, setIndividualSelection] = useState<string[]>([]);
    const [interactionMode, setInteractionMode] = useState<'SOLO' | 'MUTE'>('SOLO');

    // Selection Box State
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number, y: number } | null>(null);

    // HOLD-TO-CONFIRM STATE
    const [pendingSelection, setPendingSelection] = useState<string[]>([]); // Items currently in box but not confirmed
    const [selectionProgress, setSelectionProgress] = useState(0); // 0 to 1
    const [isSelectionLocked, setIsSelectionLocked] = useState(false); // True once 1s passes and items are added

    // Refs for Animation Loop (To avoid re-triggering effects on state change)
    const pendingSelectionRef = useRef<string[]>([]);
    const isSelectionLockedRef = useRef(false);
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);
    const dragCurrentRef = useRef<{ x: number, y: number } | null>(null); // Track current drag position for global release

    // State for the fading-out box animation (macOS style) - NOW AN ARRAY
    const [fadingBoxes, setFadingBoxes] = useState<FadingBox[]>([]);

    const containerRef = useRef<HTMLDivElement>(null);
    const progressRequestRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    // UI Scale Logic
    const [uiScale, setUiScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { width } = containerRef.current.getBoundingClientRect();
                // Base width 1280px. Scale dynamically from 0.6 to 2.0 (Supports 4K and small screens)
                const newScale = Math.min(Math.max(width / 1280, 0.6), 2.0);
                setUiScale(newScale);
            }
        };

        updateScale();
        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Sync Refs with State
    useEffect(() => {
        pendingSelectionRef.current = pendingSelection;
    }, [pendingSelection]);

    useEffect(() => {
        isSelectionLockedRef.current = isSelectionLocked;
    }, [isSelectionLocked]);

    useEffect(() => {
        dragStartRef.current = dragStart;
    }, [dragStart]);

    useEffect(() => {
        dragCurrentRef.current = dragCurrent;
    }, [dragCurrent]);

    // --- INTERACTION LOGIC ---

    const handleGroupClick = (group: string) => {
        if (selectedGroup === group) {
            setSelectedGroup(null);
        } else {
            setSelectedGroup(group);
            setIndividualSelection([]); // Clear individual when group selected
        }
    };

    // Calculate States
    const isSpeakerSelected = (spkId: string) => {
        if (individualSelection.includes(spkId)) return true;
        if (selectedGroup && GROUPS[selectedGroup]?.includes(spkId)) return true;
        return false;
    };

    const getSpeakerState = (spkId: string): "default" | "active" | "dimmed" | "muted" | "highlighted" => {
        // 1. External Highlight (Edit Focus) - Top Priority for "Identity" but implies NO audio change
        // However, if we ALSO have Solo active, Solo takes visual precedence for "Status"

        const selected = isSpeakerSelected(spkId); // Internal Solo/Mute selection

        if (interactionMode === 'SOLO') {
            const hasSoloSelection = individualSelection.length > 0 || selectedGroup;

            if (selected) return 'active'; // Explicitly Soloed

            if (hasSoloSelection) {
                // If Solo is active, others are dimmed... 
                // If this speaker is the one being Edited (Highlighted), we show it as Highlighted
                // (It might be technically muted by the Solo of another, but user wants to see what they are editing)
                if (spkId === highlightedId) return 'highlighted';
                return 'dimmed';
            }

            // If NO Solo selection active (Pure Edit Mode):
            if (spkId === highlightedId) return 'highlighted';
            return 'default'; // OTHERS STAY DEFAULT (No dimming)
        } else {
            // MUTE MODE
            if (selected) return 'muted';
            if (spkId === highlightedId) return 'highlighted';
            return 'default';
        }
    };

    const isSpeakerPending = (spkId: string) => {
        // Pending logic applies to selection box preview
        // Note: We need to know if pending means "about to be active" or "about to be muted"
        return pendingSelection.includes(spkId) && !isSpeakerSelected(spkId);
    };

    const selectedSpeakerData = speakers.find(s => individualSelection.length === 1 && s.id === individualSelection[0]);
    const isSelectionActive = individualSelection.length > 0 || selectedGroup !== null;

    // --- DRAG SELECTION LOGIC ---

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only left click
        if (e.button !== 0) return;

        // If clicking a control (button), don't start drag
        if ((e.target as HTMLElement).closest('button')) return;

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setDragStart({ x, y });
        setDragCurrent({ x, y });

        // NOTE: We do NOT clear fadingBoxes here anymore. 
        // This allows previous animations to finish even if a new click happens.

        // Reset Confirmation Logic
        setPendingSelection([]);
        setSelectionProgress(0);
        setIsSelectionLocked(false);
        lastTimeRef.current = 0; // Reset timer
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragStart || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        // Clamp coordinates to container bounds
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

        setDragCurrent({ x, y });

        // Calculate Selection Intersection
        const selectionRect = {
            left: Math.min(dragStart.x, x),
            top: Math.min(dragStart.y, y),
            right: Math.max(dragStart.x, x),
            bottom: Math.max(dragStart.y, y)
        };

        // Find speakers inside rect
        const newPending: string[] = [];

        speakers.forEach(spk => {
            const PADDING = 10;
            const percentX = ((spk.x + 1) / 2) * (100 - PADDING * 2) + PADDING;
            const percentY = ((spk.y + 1) / 2) * (100 - PADDING * 2) + PADDING;

            const spkPxX = (percentX / 100) * rect.width;
            const spkPxY = (percentY / 100) * rect.height;

            // 3D Transform Compensation: Precision Mode
            // Reduced tolerances to prevent accidental selection (mis-touch)
            const baseTolerance = 6;

            // Height speakers visually shift slightly, so we add a small, focused buffer
            // barely larger than the visual badge itself
            const perspectiveBonus = spk.z > 0 ? 12 : 0;

            const hitTolerance = baseTolerance + perspectiveBonus;

            if (
                spkPxX >= selectionRect.left - hitTolerance &&
                spkPxX <= selectionRect.right + hitTolerance &&
                spkPxY >= selectionRect.top - hitTolerance &&
                spkPxY <= selectionRect.bottom + hitTolerance
            ) {
                newPending.push(spk.id);
            }
        });

        setPendingSelection(newPending);
    };

    const createFadingBox = (start: { x: number, y: number }, current: { x: number, y: number }) => {
        const left = Math.min(start.x, current.x);
        const top = Math.min(start.y, current.y);
        const width = Math.abs(current.x - start.x);
        const height = Math.abs(current.y - start.y);

        // Only create if dimensions are visible
        if (width > 2 || height > 2) {
            const id = Date.now().toString() + Math.random().toString();

            setFadingBoxes(prev => [...prev, { id, left, top, width, height }]);

            // Remove this specific box after animation finishes
            setTimeout(() => {
                setFadingBoxes(prev => prev.filter(box => box.id !== id));
            }, 300);
        }
    };

    const handleMouseUp = () => {
        if (dragStart && dragCurrent) {
            createFadingBox(dragStart, dragCurrent);
        }
        setDragStart(null);
        setDragCurrent(null);
        setPendingSelection([]);
        setSelectionProgress(0);
        setIsSelectionLocked(false);
    };

    // Add global mouse up listener
    useEffect(() => {
        const globalMouseUp = () => {
            if (dragStartRef.current) {
                const start = dragStartRef.current;
                const current = dragCurrentRef.current;

                if (current) {
                    createFadingBox(start, current);
                }

                setDragStart(null);
                setDragCurrent(null);
                setPendingSelection([]);
                setSelectionProgress(0);
                setIsSelectionLocked(false);
            }
        };

        if (dragStart) {
            window.addEventListener('mouseup', globalMouseUp);
        }
        return () => window.removeEventListener('mouseup', globalMouseUp);
    }, [dragStart]); // Dependencies needed to re-bind with current state context if needed


    // --- ANIMATION FRAME FOR CONFIRMATION (1s Timer) ---
    const animateConfirmation = useCallback((time: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const deltaTime = time - lastTimeRef.current;
        lastTimeRef.current = time;

        const currentPending = pendingSelectionRef.current;
        const currentLocked = isSelectionLockedRef.current;
        const currentDragStart = dragStartRef.current;

        // Only progress if we have pending items and haven't locked yet
        if (currentPending.length > 0 && !currentLocked) {
            setSelectionProgress(prev => {
                const newProgress = Math.min(1, prev + (deltaTime / 1000)); // 1000ms = 1s

                if (newProgress >= 1) {
                    // CONFIRMATION TRIGGER
                    setIsSelectionLocked(true);
                    setSelectedGroup(null);

                    // Add pending items to individual selection (Additive logic)
                    setIndividualSelection(current => {
                        const newSet = new Set(current);
                        currentPending.forEach(id => newSet.add(id));
                        return Array.from(newSet);
                    });
                    return 1;
                }
                return newProgress;
            });
        } else if (currentPending.length === 0) {
            // Reset if box becomes empty
            setSelectionProgress(0);
        }

        // Continue loop if we are still dragging and haven't locked yet
        if (currentDragStart && !currentLocked) {
            progressRequestRef.current = requestAnimationFrame(animateConfirmation);
        }
    }, []);

    useEffect(() => {
        // Start the loop when drag starts
        if (dragStart && !isSelectionLocked) {
            lastTimeRef.current = performance.now();
            progressRequestRef.current = requestAnimationFrame(animateConfirmation);
        } else {
            cancelAnimationFrame(progressRequestRef.current);
        }
        return () => cancelAnimationFrame(progressRequestRef.current);
    }, [dragStart, isSelectionLocked, animateConfirmation]);


    // Calculate Box Style for Rendering
    const getSelectionBoxStyle = () => {
        if (!dragStart || !dragCurrent) return {};
        const left = Math.min(dragStart.x, dragCurrent.x);
        const top = Math.min(dragStart.y, dragCurrent.y);
        const width = Math.abs(dragCurrent.x - dragStart.x);
        const height = Math.abs(dragCurrent.y - dragStart.y);
        return { left, top, width, height };
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full flex flex-col overflow-hidden group cursor-crosshair select-none ${variant === 'editor' ? 'bg-transparent' : 'bg-[#08090c]'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Helper style for fade out animation */}
            <style>{`
            @keyframes selectionFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes pulse-slow {
                0%, 100% { opacity: 1; box-shadow: 0 0 15px rgba(239,68,68,0.4); }
                50% { opacity: 0.8; box-shadow: 0 0 5px rgba(239,68,68,0.2); }
            }
            .animate-pulse-slow {
                animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            /* Hide scrollbar but keep functionality */
            .no-scrollbar::-webkit-scrollbar {
                display: none;
            }
            .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
        `}</style>

            {/* --- BACKGROUND EFFECTS --- */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                {/* 1. Base Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#151619]/30 via-[#0a0b0e] to-[#08090c]"></div>

                {/* 2. Top "Studio Light" Wash */}
                <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a1b1f]/15 via-[#111216]/8 to-transparent"></div>

                {/* 3. Bottom Reflection */}
                <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#1a1b1f]/10 via-transparent to-transparent"></div>

                {/* 4. Active Group Halo */}
                <div
                    className={`absolute inset-0 bg-[radial-gradient(circle_at_center,#2eb8cc_0%,transparent_50%)] transition-opacity duration-700 ease-in-out mix-blend-screen
                ${selectedGroup || individualSelection.length > 0 ? 'opacity-15' : 'opacity-0'}`}
                ></div>
            </div>

            {/* macOS Style Selection Box (Active) */}
            {dragStart && dragCurrent && (
                <div
                    className={`
                    absolute z-50 pointer-events-none rounded-[2px] transition-colors duration-200 flex items-center justify-center
                    ${isSelectionLocked ? 'border-2 border-[#0fa070] bg-[#0fa070]/10 shadow-[0_0_20px_rgba(15,160,112,0.25)]' : 'bg-white/[0.04] border border-white/30'}
                `}
                    style={getSelectionBoxStyle()}
                >
                    {/* LABEL - Only shows while holding/loading */}
                    {!isSelectionLocked && pendingSelection.length > 0 && (
                        <div className="px-2 py-1 bg-[#0a0b0e]/80 backdrop-blur rounded border border-white/15 text-[#e4e4e7] text-[10px] font-bold tracking-widest shadow-xl whitespace-nowrap">
                            {interactionMode} <span className={interactionMode === 'SOLO' ? 'text-[#2eb8cc]' : 'text-[#dc2626]'}>{pendingSelection.length}</span>
                        </div>
                    )}

                    {/* Progress Bar (Attached to bottom of box) */}
                    {!isSelectionLocked && pendingSelection.length > 0 && (
                        <div className="absolute bottom-[-6px] left-0 w-full h-[4px] bg-[#1a1b1f] rounded-full overflow-hidden shadow-sm">
                            <div
                                className={`h-full ${interactionMode === 'SOLO' ? 'bg-[#2eb8cc]' : 'bg-[#dc2626]'} will-change-[width]`}
                                style={{ width: `${selectionProgress * 100}%` }}
                            ></div>
                        </div>
                    )}
                </div>
            )}

            {/* macOS Style Selection Box (Fading Out Arrays) */}
            {fadingBoxes.map(box => (
                <div
                    key={box.id}
                    className="absolute bg-white/[0.04] border border-white/30 z-50 pointer-events-none rounded-[2px]"
                    style={{
                        left: box.left,
                        top: box.top,
                        width: box.width,
                        height: box.height,
                        animation: 'selectionFadeOut 300ms ease-out forwards'
                    }}
                ></div>
            ))}

            {/* HEADER - Only in Default Mode */}
            {variant !== 'editor' && (
                <div
                    className="absolute top-0 left-0 right-0 z-30 flex justify-between px-6 py-6 items-start pointer-events-none select-none"
                    style={{ transform: `scale(${uiScale})`, transformOrigin: 'top left' }}
                >
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[#71717a] font-mono text-[10px] tracking-widest uppercase">MONITORING</span>
                        </div>
                        <span className="text-[#52525b] font-bold text-xl tracking-tight mt-1">{formatLabel} PLANAR</span>
                    </div>
                </div>
            )}

            {/* HEADER - Editor Mode (Simplified) */}
            {variant === 'editor' && (
                <>
                    {/* Format Label - Top Left */}
                    <div
                        className="absolute top-0 left-0 z-30 p-6 pointer-events-none select-none"
                        style={{ transform: `scale(${uiScale})`, transformOrigin: 'top left' }}
                    >
                        <span
                            className="font-bold text-xl tracking-tight"
                            style={{ color: `${themeColor}99` }}
                        >
                            {formatLabel} PLANAR
                        </span>
                    </div>


                </>
            )}

            {/* TOP CENTER: Context Switcher (Fluid Sliding Toggle) - MOVED FROM BOTTOM */}
            {variant !== 'editor' && (
                <div
                    className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none"
                    style={{ transform: `translateX(-50%) scale(${uiScale})`, transformOrigin: 'top center' }}
                >
                    <div className="relative flex bg-[#0a0b0e]/60 backdrop-blur-md rounded-lg border border-[#2a2b30]/80 p-[4px] shadow-2xl w-[240px] h-[44px]">
                        {/* The Sliding Highlight */}
                        <div
                            className={`absolute top-[4px] bottom-[4px] w-[calc(50%-4px)] rounded bg-[#151619] border border-[#3f3f46]/50 shadow-[0_2px_10px_rgba(0,0,0,0.4)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-0
                            ${context === 'SOURCE' ? 'left-[4px]' : 'left-[calc(50%)]'}
                            `}
                        >
                            {/* Optional Glow based on selection */}
                            <div className={`absolute inset-0 rounded opacity-15 transition-colors duration-500 ${context === 'SOURCE' ? 'bg-[#0fa070]' : 'bg-[#6366f1]'}`}></div>
                        </div>

                        <button
                            className={`
                                flex-1 relative z-10 flex items-center justify-center text-xs font-bold uppercase tracking-widest transition-colors duration-200
                                ${context === 'SOURCE' ? 'text-[#0fa070]' : 'text-[#71717a] hover:text-[#a1a1aa]'}
                            `}
                            onClick={() => onContextChange && onContextChange('SOURCE')}
                        >
                            Sources
                        </button>

                        <button
                            className={`
                                flex-1 relative z-10 flex items-center justify-center text-xs font-bold uppercase tracking-widest transition-colors duration-200
                                ${context === 'OUTPUT' ? 'text-[#818cf8]' : 'text-[#71717a] hover:text-[#a1a1aa]'}
                            `}
                            onClick={() => onContextChange && onContextChange('OUTPUT')}
                        >
                            Outputs
                        </button>
                    </div>
                </div>
            )}

            {/* FLOATING CONTROL STACK */}
            {/* BOTTOM CENTER: FLOATING CONTROL STACK - MOVED FROM TOP */}
            {/* EDITOR MODE TOOBAR - FIXED POSITION (Wrapper to escape flex parent) */}
            {/* EDITOR MODE TOOLBAR - DOCKED STRIP (Flush Bottom-Left) */}
            {/* EDITOR MODE TOOLBAR - FULL WIDTH STRIP */}
            {variant === 'editor' && (
                <div
                    className="absolute inset-0 z-[100] pointer-events-none flex flex-col justify-end"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                >
                    <div className="w-full min-h-[40px] bg-[#0c0d11] border-t border-white/[0.06] pointer-events-auto flex items-center justify-between px-3 py-1.5 shadow-2xl backdrop-blur-md select-none gap-2">

                        {/* LEFT: Mode & Groups */}
                        <div className="flex items-center gap-2 min-w-0 flex-1 h-full font-medium">
                            {/* Mode Switcher - Fixed */}
                            <div className="flex gap-1 shrink-0 bg-white/[0.04] rounded-md p-1">
                                {['SOLO', 'MUTE'].map((m) => (
                                    <button
                                        key={m}
                                        onClick={(e) => { e.stopPropagation(); setInteractionMode(m as 'SOLO' | 'MUTE'); }}
                                        className={`
                                            px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center min-w-[40px]
                                            ${interactionMode === m
                                                ? (m === 'SOLO' ? 'bg-[#1a8a9c]/50 text-[#2eb8cc] shadow-sm' : 'bg-[#b91c1c]/50 text-[#dc2626] shadow-sm')
                                                : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.04]'
                                            }
                                        `}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>

                            {/* Groups - Scrollable & Flexible */}
                            <div className="flex gap-1 overflow-x-auto no-scrollbar items-center flex-nowrap flex-1 min-w-0 mask-linear-fade pr-4">
                                {Object.keys(GROUPS).map(g => {
                                    const active = selectedGroup === g;
                                    const hasSpk = speakers.some(s => GROUPS[g].includes(s.id));
                                    return (
                                        <button
                                            key={g}
                                            disabled={!hasSpk}
                                            onClick={(e) => { e.stopPropagation(); if (hasSpk) { if (active) { setSelectedGroup(null); setIndividualSelection([]); } else { setSelectedGroup(g); setIndividualSelection(GROUPS[g]); } } }}
                                            className={`
                                                px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border border-transparent shrink-0
                                                ${!hasSpk
                                                    ? 'opacity-20 hidden'
                                                    : active
                                                        ? 'text-[#e4e4e7] bg-white/[0.08] border-white/[0.08] shadow-inner'
                                                        : 'text-[#52525b] hover:text-[#a1a1aa] hover:bg-white/[0.04]'
                                                }
                                            `}
                                        >
                                            {g}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* RIGHT: CLR Button (Fixed) */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (selectedGroup || individualSelection.length > 0 || (speakerOverrides && Object.values(speakerOverrides).some((v: any) => v.color))) {
                                    setIndividualSelection([]);
                                    setSelectedGroup(null);
                                    if (onCleanAll) onCleanAll();
                                }
                            }}
                            disabled={!(selectedGroup || individualSelection.length > 0 || (speakerOverrides && Object.values(speakerOverrides).some((v: any) => v.color)))}
                            className={`
                                px-4 py-1.5 rounded-md flex items-center gap-2 transition-all group border shrink-0 min-w-[80px] justify-center ml-auto
                                ${(selectedGroup || individualSelection.length > 0 || (speakerOverrides && Object.values(speakerOverrides).some((v: any) => v.color)))
                                    ? 'bg-[#dc2626]/10 border-[#dc2626]/20 text-[#dc2626] hover:bg-[#dc2626]/15 hover:border-[#dc2626]/30 hover:shadow-[0_0_10px_rgba(220,38,38,0.12)] cursor-pointer'
                                    : 'bg-white/[0.04] border-transparent text-[#52525b] cursor-not-allowed'
                                }
                            `}
                            title="Clear Selection"
                        >
                            <RotateCw size={12} className={`transition-transform duration-500 ${(selectedGroup || individualSelection.length > 0) ? 'group-hover:rotate-180' : ''}`} />
                            <span className="text-[10px] font-bold tracking-widest">CLR</span>
                        </button>
                    </div>
                </div>
            )}

            {/* DEFAULT MODE CONTROL STACK (Centered, Scaled) */}
            {variant !== 'editor' && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 z-[45] bottom-8 pointer-events-none flex flex-col items-center justify-end"
                    style={{
                        transform: `translateX(-50%) scale(${uiScale})`,
                        transformOrigin: 'bottom center'
                    }}
                >
                    {/* Context Info Panel (Merged "Tab" Style) - Absolute Positioned Behind Toolbar */}
                    <div className={`
                        absolute left-1/2 -translate-x-1/2 z-10 bottom-0
                        pointer-events-none select-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                        ${(selectedGroup || individualSelection.length > 0)
                            ? 'opacity-100 -translate-y-[52px] scale-100'
                            : 'opacity-0 -translate-y-[10px] scale-95'
                        }
                    `}>
                        <div className="flex items-center gap-2 px-5 py-1.5 bg-[#0a0b0e]/90 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-lg whitespace-nowrap">
                            {selectedSpeakerData ? (
                                <>
                                    <span className="text-xs font-bold text-[#e4e4e7] tracking-widest">{selectedSpeakerData.label}</span>
                                    <span className="w-px h-3 bg-white/15"></span>
                                    <span className="text-xs text-[#a1a1aa] font-mono">CH {selectedSpeakerData.index}</span>
                                </>
                            ) : individualSelection.length > 1 ? (
                                <span className={`text-xs font-bold tracking-[0.2em] uppercase ${interactionMode === 'SOLO' ? 'text-[#2eb8cc]' : 'text-[#dc2626]'}`}>
                                    {individualSelection.length} SPEAKERS {interactionMode}
                                </span>
                            ) : selectedGroup ? (
                                <span className={`text-xs font-bold tracking-[0.2em] uppercase text-[#e4e4e7]`}>
                                    {selectedGroup} GROUP
                                    <span className={`ml-2 ${interactionMode === 'SOLO' ? 'text-[#2eb8cc]' : 'text-[#dc2626]'}`}>{interactionMode}</span>
                                </span>
                            ) : null}
                        </div>
                    </div>
                    {/* Main Toolbar (Capsule) - Relative Z-20 to sit on top */}
                    <div className="relative z-20 flex items-center gap-5 pointer-events-auto bg-[#0a0b0e]/90 backdrop-blur-2xl border border-white/[0.08] rounded-full px-6 py-2.5 shadow-2xl shadow-black/70 select-none">

                        {/* Solo/Mute Segmented Control */}
                        <div className="flex bg-white/[0.04] rounded-full p-1 relative items-center">
                            {['SOLO', 'MUTE'].map((m) => (
                                <button
                                    key={m}
                                    onClick={(e) => { e.stopPropagation(); setInteractionMode(m as 'SOLO' | 'MUTE'); }}
                                    className={`
                                        relative z-10 px-6 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center
                                        ${interactionMode === m
                                            ? (m === 'SOLO' ? 'text-[#2eb8cc] bg-[#1a8a9c]/30 shadow-[0_0_12px_rgba(46,184,204,0.15)]' : 'text-[#dc2626] bg-[#b91c1c]/30 shadow-[0_0_12px_rgba(220,38,38,0.15)]')
                                            : 'text-[#71717a] hover:text-[#d4d4d8] hover:bg-white/[0.04]'
                                        }
                                    `}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-6 bg-white/[0.08]"></div>

                        {/* Speaker Groups */}
                        <div className="flex items-center gap-1">
                            {Object.keys(GROUPS).map(g => {
                                const active = selectedGroup === g;
                                const hasSpk = speakers.some(s => GROUPS[g].includes(s.id));
                                return (
                                    <button
                                        key={g}
                                        disabled={!hasSpk}
                                        onClick={(e) => { e.stopPropagation(); if (hasSpk) { if (active) { setSelectedGroup(null); setIndividualSelection([]); } else { setSelectedGroup(g); setIndividualSelection(GROUPS[g]); } } }}
                                        className={`
                                            px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all
                                            ${!hasSpk
                                                ? 'opacity-20 hidden'
                                                : active
                                                    ? 'text-[#e4e4e7] bg-white/[0.08] shadow-inner ring-1 ring-white/[0.08] translate-y-[1px]'
                                                    : 'text-[#71717a] hover:text-[#d4d4d8] hover:bg-white/[0.04]'
                                            }
                                        `}
                                    >
                                        {g}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Clean Button (Permanent) */}
                        <div className="w-px h-6 bg-white/[0.08]"></div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isSelectionActive) {
                                    setIndividualSelection([]);
                                    setSelectedGroup(null);
                                    if (onCleanAll) onCleanAll();
                                }
                            }}
                            disabled={!isSelectionActive}
                            className={`
                                flex items-center gap-2 px-2 transition-all group
                                ${isSelectionActive
                                    ? 'text-[#dc2626] cursor-pointer drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]'
                                    : 'text-[#71717a] cursor-not-allowed opacity-50'
                                }
                            `}
                            title="Clear Selection"
                        >
                            <RotateCw size={14} className={`transition-transform duration-500 ${isSelectionActive ? 'group-hover:rotate-180 text-[#dc2626]' : ''}`} />
                            <span className="text-xs font-bold tracking-widest uppercase">CLEAN</span>
                        </button>
                    </div>
                </div>
            )}

            {/* SCALABLE CONTENT LAYER */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden pointer-events-none">

                {/* 3D Perspective Container */}
                <div
                    className="relative w-full h-full flex items-center justify-center"
                    style={{
                        perspective: '1400px',
                        perspectiveOrigin: 'center center'
                    }}
                >
                    {/* World Container - 3D Transformed */}
                    <div
                        className="relative w-full h-full max-w-[90%] max-h-[90%] pointer-events-auto transition-transform duration-700 ease-out"
                        style={{
                            transformStyle: 'preserve-3d',
                            transform: 'rotateX(18deg) rotateZ(0deg)',
                        }}
                    >
                        {/* 3D Grid Floor */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                transform: 'translateZ(-20px)',
                                opacity: 0.14
                            }}
                        >
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundImage: `
                                        linear-gradient(to right, rgba(46, 184, 204, 0.30) 1px, transparent 1px),
                                        linear-gradient(to bottom, rgba(46, 184, 204, 0.30) 1px, transparent 1px)
                                    `,
                                    backgroundSize: '60px 60px',
                                    backgroundPosition: 'center center'
                                }}
                            />
                        </div>

                        {/* Speakers */}
                        {speakers.map(spk => {
                            const PADDING = 10;
                            const left = ((spk.x + 1) / 2) * (100 - PADDING * 2) + PADDING;
                            const top = ((spk.y + 1) / 2) * (100 - PADDING * 2) + PADDING;

                            const state = getSpeakerState(spk.id);
                            const isActive = state === 'active';
                            // Hybrid State Support: Highlighted is now independent of State (Solo/Active)
                            const isHighlighted = spk.id === highlightedId;
                            const isMuted = state === 'muted';
                            const isDimmed = state === 'dimmed';
                            const isPending = isSpeakerPending(spk.id);
                            const isHeight = spk.z > 0;

                            // 1. Base Theme (Default/Zinc)
                            let theme = {
                                text: 'text-white font-bold', // Maximum Brightness
                                border: 'border-zinc-500/80',
                                bg: 'bg-zinc-900/40',
                                shadow: 'shadow-[0_0_15px_rgba(255,255,255,0.05)]',
                                activeText: 'text-white font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]',
                                activeBorder: 'border-white',
                                activeBg: 'bg-white/20',
                                activeShadow: 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),0_0_20px_rgba(255,255,255,0.4)]',
                                glowColor: 'bg-zinc-500',
                                // Highlighted Theme (EDIT FOCUS - Cyan/Sky)
                                highlightedText: 'text-cyan-300 font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]',
                                highlightedBorder: 'border-cyan-400',
                                highlightedBg: 'bg-cyan-500/20',
                                highlightedShadow: 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),0_0_30px_rgba(34,211,238,0.6),inset_0_0_20px_rgba(34,211,238,0.3)]',
                                // Mute Theme
                                mutedText: 'text-red-500',
                                mutedBorder: 'border-red-600',
                                mutedBg: 'bg-red-950/80',
                                mutedShadow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
                                hoverBorder: 'group-hover:border-zinc-500/50',
                                hoverBg: 'group-hover:bg-zinc-800/30'
                            };

                            // 2. Group Overrides (Color Coding)
                            // 2. Group Overrides (Color Coding)
                            // 2. Group Overrides (Color Coding) & Base Color Determination
                            let baseColor = 'emerald';
                            if (GROUPS['Front'].includes(spk.id)) baseColor = 'rose';
                            else if (GROUPS['Sub'].includes(spk.id)) baseColor = 'purple';
                            else if (isHeight) baseColor = 'sky';

                            // Apply Base Theme based on Group
                            if (baseColor === 'rose') {
                                theme.glowColor = 'bg-rose-500';
                                theme.text = 'text-rose-100 font-bold'; // BRIGHTENED from 300
                                theme.border = 'border-rose-600/80';
                                theme.bg = 'bg-rose-950/50';
                                theme.shadow = 'shadow-[0_0_12px_rgba(251,113,133,0.15)]';
                                theme.activeText = 'text-rose-50 font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
                                theme.activeBorder = 'border-rose-400';
                                theme.activeBg = 'bg-rose-500/20';
                                theme.activeShadow = 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),0_0_30px_rgba(251,113,133,0.6),inset_0_0_20px_rgba(251,113,133,0.3)]';
                                theme.hoverBorder = 'group-hover:border-rose-500/60';
                                theme.hoverBg = 'group-hover:bg-rose-900/40';
                            } else if (baseColor === 'purple') {
                                theme.glowColor = 'bg-purple-500';
                                theme.text = 'text-purple-100 font-bold'; // BRIGHTENED from 300
                                theme.border = 'border-purple-600/80';
                                theme.bg = 'bg-purple-950/50';
                                theme.shadow = 'shadow-[0_0_12px_rgba(192,132,252,0.15)]';
                                theme.activeText = 'text-purple-50 font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
                                theme.activeBorder = 'border-purple-400';
                                theme.activeBg = 'bg-purple-500/20';
                                theme.activeShadow = 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),0_0_30px_rgba(192,132,252,0.6),inset_0_0_20px_rgba(192,132,252,0.3)]';
                                theme.hoverBorder = 'group-hover:border-purple-500/60';
                                theme.hoverBg = 'group-hover:bg-purple-900/40';
                            } else if (baseColor === 'sky') {
                                theme.glowColor = 'bg-sky-500';
                                theme.text = 'text-sky-100 font-bold'; // BRIGHTENED from 300
                                theme.border = 'border-sky-600/80';
                                theme.bg = 'bg-sky-950/50';
                                theme.shadow = 'shadow-[0_0_12px_rgba(56,189,248,0.15)]';
                                theme.activeText = 'text-sky-50 font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
                                theme.activeBorder = 'border-sky-400';
                                theme.activeBg = 'bg-sky-500/20';
                                theme.activeShadow = 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),0_0_30px_rgba(56,189,248,0.6),inset_0_0_20px_rgba(56,189,248,0.3)]';
                                theme.hoverBorder = 'group-hover:border-sky-500/60';
                                theme.hoverBg = 'group-hover:bg-sky-900/40';
                            } else {
                                // Emerald (Surrounds)
                                theme.glowColor = 'bg-emerald-500';
                                theme.text = 'text-emerald-100 font-bold'; // BRIGHTENED from 300
                                theme.border = 'border-emerald-600/80';
                                theme.bg = 'bg-emerald-950/50';
                                theme.shadow = 'shadow-[0_0_12px_rgba(52,211,153,0.15)]';
                                theme.activeText = 'text-emerald-50 font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
                                theme.activeBorder = 'border-emerald-400';
                                theme.activeBg = 'bg-emerald-500/20';
                                theme.activeShadow = 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),0_0_30px_rgba(52,211,153,0.6),inset_0_0_20px_rgba(52,211,153,0.3)]';
                                theme.hoverBorder = 'group-hover:border-emerald-500/60';
                                theme.hoverBg = 'group-hover:bg-emerald-900/40';
                            }

                            // 3. Dynamic Overrides (from props)
                            if (speakerOverrides && speakerOverrides[spk.id]) {
                                if (speakerOverrides[spk.id].color) theme.activeBg = speakerOverrides[spk.id].color!;
                                if (speakerOverrides[spk.id].ring) theme.activeBorder = speakerOverrides[spk.id].ring!;
                            }

                            // 4. Determine Final Classes
                            let finalText = theme.text;
                            let finalBorder = theme.border;
                            let finalBg = theme.bg;
                            let finalShadow = theme.shadow;
                            let finalRing = '';
                            let finalOpacity = 'opacity-100';

                            // EXPLICIT COLOR MAPS for Tailwind JIT
                            const COLOR_MAPS: Record<string, any> = {
                                rose: {
                                    text: 'text-rose-300', activeText: 'text-rose-50',
                                    border: 'border-rose-400', dimBorder: 'border-rose-900/50',
                                    bg: 'bg-rose-500/50', dimBg: 'bg-rose-950/60', // 50-60% Opacity
                                    shadow: 'shadow-[0_0_15px_rgba(251,113,133,0.3)]',
                                    ring: 'ring-rose-400'
                                },
                                purple: {
                                    text: 'text-purple-300', activeText: 'text-purple-50',
                                    border: 'border-purple-400', dimBorder: 'border-purple-900/50',
                                    bg: 'bg-purple-500/50', dimBg: 'bg-purple-950/60',
                                    shadow: 'shadow-[0_0_15px_rgba(192,132,252,0.3)]',
                                    ring: 'ring-purple-400'
                                },
                                sky: {
                                    text: 'text-sky-300', activeText: 'text-sky-50',
                                    border: 'border-sky-400', dimBorder: 'border-sky-900/50',
                                    bg: 'bg-sky-500/50', dimBg: 'bg-sky-950/60',
                                    shadow: 'shadow-[0_0_15px_rgba(56,189,248,0.3)]',
                                    ring: 'ring-sky-400'
                                },
                                emerald: {
                                    text: 'text-emerald-300', activeText: 'text-emerald-50',
                                    border: 'border-emerald-400', dimBorder: 'border-emerald-900/50',
                                    bg: 'bg-emerald-500/50', dimBg: 'bg-emerald-950/60',
                                    shadow: 'shadow-[0_0_15px_rgba(52,211,153,0.3)]',
                                    ring: 'ring-emerald-400'
                                }
                            };

                            const colors = COLOR_MAPS[baseColor] || COLOR_MAPS['emerald'];

                            if (isActive) {
                                // SOLO/ACTIVE: Use Group Theme
                                finalText = theme.activeText; // Already set correctly in block above
                                finalBorder = theme.activeBorder;
                                finalBg = colors.bg; // USE EXPLICIT BG
                                finalShadow = theme.activeShadow;

                                // Explicitly ensuring border width and style for active state
                                if (!finalBorder.includes('border-2')) finalBorder += ' border-2';
                            } else if (isHighlighted) {
                                // EDIT FOCUS ONLY (No Solo):
                                // Use Group Color for Border/Text instead of Cyan
                                finalText = `${colors.text} font-bold`;
                                finalBorder = colors.border;
                                finalBg = colors.dimBg; // Use darker bg
                                finalShadow = colors.shadow;
                            } else if (isMuted) {
                                finalText = theme.mutedText;
                                finalBorder = theme.mutedBorder;
                                finalBg = theme.mutedBg;
                                finalShadow = theme.mutedShadow;
                                finalOpacity = 'opacity-50';
                            } else if (isPending) {
                                const isMutePending = interactionMode === 'MUTE';
                                finalBorder = `border-2 border-dashed ${isMutePending ? '' : 'border-white/60'}`;
                                finalBg = isMutePending ? 'bg-red-900/20' : 'bg-white/5';
                                finalText = isMutePending ? 'text-red-400' : theme.text;
                                finalShadow = 'shadow-[0_0_10px_rgba(255,255,255,0.2)]';
                            } else if (isDimmed) {
                                // DIMMED: Keep original color identity but fade it
                                // UPDATED: Full Opacity (1.0) but with semi-transparent background color
                                finalText = 'text-zinc-300'; // Brightened further from 400
                                finalBorder = colors.dimBorder;
                                finalBg = colors.dimBg;
                                finalShadow = 'none';
                                finalOpacity = 'opacity-100'; // NO TRANSPARENCY on element, controlled by bg color
                            }

                            // OVERLAY RING: Applied INDEPENDENTLY if Highlighted
                            // This allows Hybrid State: Solo (Glow) + Highlight (Ring)
                            if (isHighlighted) {
                                // Dynamic Ring Color matches Group
                                finalRing = `ring-2 ${colors.ring} ring-offset-2 ring-offset-black/50`;
                            }

                            // 5. Geometry & Z-Depth
                            const zDepth = spk.z * 110;
                            // Outer Container Size (Hitbox)
                            const sizeClass = isHeight ? 'w-20 h-24' : 'w-16 h-20';

                            // Scale Logic
                            const baseScale = 1;
                            const activeScale = (isActive || isHighlighted) ? 1.15 : (isPending ? 1.05 : (isDimmed || isMuted ? 0.95 : 1));
                            const totalScale = baseScale * activeScale;

                            // Badge Class (The visual box)
                            // RESTORED DIMENSIONS: w-14 h-10 (standard), w-12 h-14 (heights potential modification if needed, but keeping consistent for now)
                            const badgeClass = `
                                w-14 h-10 rounded border-[1.5px] flex items-center justify-center backdrop-blur-sm transition-all duration-300 relative overflow-visible pointer-events-none
                                ${finalText} ${finalBorder} ${finalBg} ${finalShadow} ${finalRing} ${finalOpacity}
                                ${(!isActive && !isHighlighted && !isMuted && !isDimmed) ? `${theme.hoverBorder} ${theme.hoverBg} group-hover:scale-105` : ''}
                            `;

                            return (
                                <div
                                    key={spk.id}
                                    className={`absolute ${sizeClass} flex flex-col items-center justify-center group transform-gpu cursor-pointer transition-all duration-500 ease-out ${isActive || isHighlighted || isPending ? 'z-20' : 'z-10'} select-none`}
                                    style={{
                                        left: `${left}%`,
                                        top: `${top}%`,
                                        transform: `translate(-50%, -50%) translateZ(${zDepth}px) scale(${totalScale})`,
                                        transformStyle: 'preserve-3d'
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSpeakerClick) onSpeakerClick(spk.id, interactionMode);

                                        // Standard Selection Logic (Visualizer Internal)
                                        // Restored to allow Solo/Mute state to be tracked visually
                                        const isMultiSelect = e.metaKey || e.ctrlKey;
                                        if (selectedGroup) {
                                            setSelectedGroup(null);
                                            setIndividualSelection([spk.id]);
                                        } else {
                                            setIndividualSelection(prev =>
                                                prev.includes(spk.id) ? prev.filter(id => id !== spk.id) : [...prev, spk.id]
                                            );
                                        }
                                    }}
                                >
                                    {/* Height Shadow */}
                                    {isHeight && (
                                        <div
                                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-500"
                                            style={{
                                                width: `${100 + spk.z * 40}%`,
                                                height: `${100 + spk.z * 40}%`,
                                                background: 'radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)',
                                                filter: `blur(${8 + spk.z * 4}px)`,
                                                transform: `translateZ(-${zDepth}px) translate(-50%, -50%) scale(${0.9 + spk.z * 0.3})`,
                                                transformStyle: 'preserve-3d',
                                                zIndex: -10,
                                                opacity: (isDimmed || isMuted) ? 0.3 : 1
                                            }}
                                        ></div>
                                    )}

                                    {/* Height Line */}
                                    {isHeight && (isActive || isPending) && (
                                        <div
                                            className="absolute left-1/2 top-1/2 w-[2px] pointer-events-none transition-all duration-500"
                                            style={{
                                                height: `${zDepth * 0.8}px`,
                                                background: `linear-gradient(to bottom, ${theme.glowColor.replace('bg-', 'rgba(')}${theme.glowColor.includes('rose') ? '251,113,133' : theme.glowColor.includes('sky') ? '56,189,248' : '52,211,153'}, 0.6), transparent)`,
                                                transform: `translateZ(-${zDepth / 2}px) translateX(-50%) translateY(20px) rotateX(90deg)`,
                                                transformStyle: 'preserve-3d',
                                                transformOrigin: 'top center',
                                                opacity: 0.4,
                                                filter: 'blur(1px)'
                                            }}
                                        ></div>
                                    )}

                                    {/* Edit Hint Line (Highlighted Only) */}
                                    {isHighlighted && !isActive && (
                                        <div
                                            className="absolute left-1/2 top-1/2 w-[1px] pointer-events-none transition-all duration-300 bg-cyan-500/50"
                                            style={{
                                                height: `${zDepth + 100}px`, // Go deep
                                                transform: `translateZ(-${zDepth}px) translateX(-50%) translateY(0) rotateX(90deg)`,
                                                transformStyle: 'preserve-3d',
                                                transformOrigin: 'top center',
                                                opacity: 0.3
                                            }}
                                        ></div>
                                    )}

                                    {/* Mute Indicator */}
                                    {isMuted && (
                                        <div
                                            className="absolute inset-0 z-30 pointer-events-none rounded opacity-40 mix-blend-overlay"
                                            style={{
                                                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, #ef4444 2px, #ef4444 4px)`
                                            }}
                                        ></div>
                                    )}

                                    {/* Glow Effect (Active Only - Highlighted is discreet) */}
                                    {isActive && (
                                        <div className={`
                                            absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full blur-2xl animate-pulse pointer-events-none -z-10
                                            ${theme.glowColor} opacity-40
                                        `}></div>
                                    )}

                                    {/* Speaker Badge/Icon Container */}
                                    <div className={badgeClass}>
                                        <span className="text-xs font-bold font-mono">{spk.index}</span>
                                    </div>

                                    {/* Label - BRIGHTENED */}
                                    <div className={`
                                        text-center mt-1.5 text-[11px] font-bold tracking-wider transition-all duration-300 select-none relative z-20 pointer-events-none
                                        ${(isActive || isHighlighted) ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] group-hover:text-white'}
                                    `}>
                                        {spk.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>


        </div >
    );
};
