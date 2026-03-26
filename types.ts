
export enum ComicStyle {
  FLAT_MINIMAL = "Flat Minimalist Business Illustration",
  CORPORATE_MANGA = "Modern Corporate Manga Style",
  RETRO_COMIC = "1950s Vintage American Comic Book",
  CYBERPUNK = "High-tech Cyberpunk Blueprint Style",
  WATERCOLOR = "Professional Soft Watercolor Art",
  CUSTOM = "Custom Style"
}

export type StoryLength = 6 | 9 | 12;
export type AspectRatio = "1:1" | "16:9" | "9:16";

export interface ComicPanel {
  id: string;
  visualPrompt: string;
  imageDialogue: string; // The main bold English narrative text/hook
  sceneDialogue: string; // The small English dialogue/subtitles for the plot
  caption: string;
  dialogue?: string; // Chinese version for UI
  imageUrl?: string;
  isGenerating?: boolean;
}

export interface ComicScript {
  title: string;
  visualContext: string;
  panels: ComicPanel[];
}

export interface AppState {
  whitepaperContent: string;
  selectedStyle: ComicStyle;
  customStyleText: string;
  storyLength: StoryLength;
  aspectRatio: AspectRatio;
  logoUrl?: string;
  script: ComicScript | null;
  status: 'idle' | 'scripting' | 'ready_to_illustrate' | 'illustrating' | 'error';
  errorMessage?: string;
}
