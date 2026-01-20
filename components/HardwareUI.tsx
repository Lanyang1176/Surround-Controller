// components/HardwareUI.tsx
import React from 'react';
import { cn } from '../lib/utils';

// 1. 主控机架底座 (拥有统一的边缘高光和微弱的从背景隆起的实体感)
export const ChassisCard = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn(
        "relative bg-[#0f1014] rounded-xl border border-white/[0.04]",
        "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.5)]", // 深邃投影 + 极细黑边
        "before:absolute before:inset-0 before:rounded-xl before:border before:border-white/[0.06] before:pointer-events-none", // 边缘高光 (Rim Light)
        className
    )}>
        {children}
    </div>
);

// 2. 内凹视窗 (用于仪表和控制区的深嵌入面板)
export const InsetPanel = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn(
        "relative bg-[#111216] rounded-lg overflow-hidden", // 比 chassis 稍亮一点点的内底
        "shadow-[inset_0_2px_6px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(0,0,0,0.8)]", // 柔和的内阴影 + 内描边
        "border-b border-white/[0.05]", // 底部微弱反光，增强立体感
        className
    )}>
        {children}
    </div>
);

// 3. 激光雕刻标题带 (内凹槽标题)
export const EngravedHeader = ({ label, color = "zinc", decoration = true, className }: { label: string, color?: "zinc" | "amber" | "cyan", decoration?: boolean, className?: string }) => (
    <div className={cn("h-7 w-full flex items-center px-4 gap-3 bg-[#08090c]/50 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] border-b border-white/[0.04] shrink-0", className)}>
        {decoration && (
            <div className={cn(
                "w-0.5 h-2.5 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.4)]",
                color === "amber" && "bg-[#a66d0c] shadow-[0_0_6px_rgba(212,137,15,0.35)]",
                color === "cyan" && "bg-[#1a8a9c] shadow-[0_0_6px_rgba(46,184,204,0.35)]",
                color === "zinc" && "bg-[#3f3f46]"
            )}></div>
        )}
        <span className="text-[10px] font-bold text-[#71717a] tracking-[0.2em] uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
            {label}
        </span>
        {/* 右侧插槽，用于放置额外图标等 */}
        <div className="ml-auto"></div>
    </div>
);
