export type Word = { w: string; s: number; e: number };
export type Stat = { value: number; prefix?: string; suffix?: string; label?: string; decimals?: number };
export type ChartItem = { label: string; value: number };
export type Side = { title: string; emoji?: string; points?: string[] };
export type Scene = {
  id: string; role?: string; start: number; dur: number; narration: string; headline: string; sub?: string;
  emoji?: string; icon?: string; items?: string[]; stat?: Stat;
  chart?: { type: 'bar' | 'pie'; items: ChartItem[]; unit?: string };
  steps?: { label: string; date?: string }[];
  compare?: { left: Side; right: Side };
  places?: { name: string; lat: number; lon: number }[];
  words: Word[];
  visual?: 'footage' | 'anim' | 'auto';
  footage?: { kind: 'image' | 'video'; src: string; fg?: string; w?: number; h?: number; credit?: { title?: string; creator?: string; license?: string }; render?: boolean } | null;
};
export type VideoProps = { style: string; lang: string; title: string; duration: number; scenes: Scene[]; baseVideo?: string; assetDir?: string; captionStyle?: CaptionTheme; cinema?: boolean };
export type SceneProps = { scene: Scene; index: number; total: number };
export type CaptionTheme = {
  variant?: 'bold' | 'doc' | 'cine';
  font?: string; size?: number; color?: string; key?: string; stroke?: string; bg?: string; y?: number; upper?: boolean; radius?: number; weight?: number;
};
export type StyleDef = {
  Scene: React.FC<SceneProps>;
  Background?: React.FC<{ props: VideoProps }>;
  Overlay?: React.FC<{ props: VideoProps }>;
  captions?: CaptionTheme | false;
  transition?: 'cut' | 'fade';
};
