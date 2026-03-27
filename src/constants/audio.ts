import { Speaker } from '../types';

// LOUDNESS STANDARDS with target LUFS values
export const LOUDNESS_STANDARDS: { name: string; target: number }[] = [
  { name: "AES Streaming", target: -16 },
  { name: "Amazon Alexa", target: -14 },
  { name: "Amazon Music", target: -14 },
  { name: "Apple Music", target: -16 },
  { name: "Apple Podcast", target: -16 },
  { name: "Deezer", target: -15 },
  { name: "Disney", target: -24 },
  { name: "EBUR128", target: -23 },
  { name: "EBUR128 S1 (Advertising)", target: -23 },
  { name: "HBO", target: -24 },
  { name: "Netflix", target: -27 },
  { name: "Sony", target: -24 },
  { name: "Spotify", target: -14 },
  { name: "Spotify Loud", target: -11 },
  { name: "Tidal", target: -14 },
  { name: "YouTube", target: -14 },
  { name: "ATSC A/85", target: -24 }
];

// Get target LUFS for current standard
export const getTargetLufs = (standardName: string): number => {
  const std = LOUDNESS_STANDARDS.find(s => s.name === standardName);
  return std?.target ?? -23;
};

// VISUAL MAPPING FOR 2D PLANAR SCENE (Top-Down Grid)
// Coords: x (-1 Left, 1 Right), y (-1 Front, 1 Rear)
export const SPEAKERS_916: Speaker[] = [
  // Fronts (Row 1) - Pushed forward
  { id: 'L', label: 'L', x: -0.45, y: -0.7, z: 0, index: 1 },
  { id: 'R', label: 'R', x: 0.45, y: -0.7, z: 0, index: 2 },
  { id: 'C', label: 'C', x: 0, y: -0.7, z: 0, index: 3 },

  // LFE (Row 2) - Slightly behind center
  { id: 'LFE', label: 'LFE', x: 0, y: -0.4, z: 0, index: 4 },

  // Wides (Row 3) - Wide and forward-mid
  { id: 'Lw', label: 'Lw', x: -0.85, y: -0.25, z: 0, index: 9 },
  { id: 'Rw', label: 'Rw', x: 0.85, y: -0.25, z: 0, index: 10 },

  // Top Fronts - Inboard and forward
  { id: 'Ltf', label: 'Ltf', x: -0.25, y: -0.25, z: 1.2, index: 11 },
  { id: 'Rtf', label: 'Rtf', x: 0.25, y: -0.25, z: 1.2, index: 12 },

  // Side Surrounds (Row 4) - Sides, slightly back from listener (0,0)
  { id: 'Ls', label: 'Lss', x: -0.9, y: 0.1, z: 0, index: 5 },
  { id: 'Rs', label: 'Rss', x: 0.9, y: 0.1, z: 0, index: 6 },

  // Top Mids - Directly side/above
  { id: 'Ltm', label: 'Ltm', x: -0.25, y: 0.1, z: 1.2, index: 13 },
  { id: 'Rtm', label: 'Rtm', x: 0.25, y: 0.1, z: 1.2, index: 14 },

  // Rear Surrounds (Row 5) - Back corners
  { id: 'Lrs', label: 'Lrs', x: -0.6, y: 0.65, z: 0, index: 7 },
  { id: 'Rrs', label: 'Rrs', x: 0.6, y: 0.65, z: 0, index: 8 },

  // Top Rears - Back inboard
  { id: 'Ltr', label: 'Ltr', x: -0.25, y: 0.5, z: 1.2, index: 15 },
  { id: 'Rtr', label: 'Rtr', x: 0.25, y: 0.5, z: 1.2, index: 16 },
];

// Colors aligned with screenshot:
// LCR (Pink), LFE (Purple), Surrounds (Green), Heights (Blue)
export const CHANNELS_16 = [
  { id: 'L', label: 'L', color: 'bg-[#fb7185]' },   // 1 Rose-400
  { id: 'R', label: 'R', color: 'bg-[#fb7185]' },   // 2
  { id: 'C', label: 'C', color: 'bg-[#fb7185]' },   // 3
  { id: 'LFE', label: 'LFE', color: 'bg-[#c084fc]' }, // 4 Purple-400
  { id: 'Ls', label: 'LS', color: 'bg-[#4ade80]' },  // 5 Green-400 (Lss)
  { id: 'Rs', label: 'RS', color: 'bg-[#4ade80]' },  // 6 (Rss)
  { id: 'Lrs', label: 'LRS', color: 'bg-[#4ade80]' }, // 7
  { id: 'Rrs', label: 'RRS', color: 'bg-[#4ade80]' }, // 8
  { id: 'Lw', label: 'LW', color: 'bg-[#4ade80]' },  // 9
  { id: 'Rw', label: 'RW', color: 'bg-[#4ade80]' },  // 10
  { id: 'Ltf', label: 'LTF', color: 'bg-[#38bdf8]' }, // 11 Sky-400
  { id: 'Rtf', label: 'RTF', color: 'bg-[#38bdf8]' }, // 12
  { id: 'Ltm', label: 'LTM', color: 'bg-[#38bdf8]' }, // 13
  { id: 'Rtm', label: 'RTM', color: 'bg-[#38bdf8]' }, // 14
  { id: 'Ltr', label: 'LTR', color: 'bg-[#38bdf8]' }, // 15
  { id: 'Rtr', label: 'RTR', color: 'bg-[#38bdf8]' }, // 16
];

export const FORMAT_CHANNELS: Record<string, string[]> = {
  '9.1.6': ['L', 'R', 'C', 'LFE', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Lw', 'Rw', 'Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'],
  '7.1.4': ['L', 'R', 'C', 'LFE', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Ltf', 'Rtf', 'Ltr', 'Rtr'],
  '5.1': ['L', 'R', 'C', 'LFE', 'Ls', 'Rs'],
  'Stereo': ['L', 'R'],
};
