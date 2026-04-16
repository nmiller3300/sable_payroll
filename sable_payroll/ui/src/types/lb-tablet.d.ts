// ============================================================================
// src/types/lb-tablet.d.ts
// Ambient type declarations for the globals that lb-tablet's components.js
// injects into our UI window at runtime.
// Sourced from the lb-tablet-reactts template's components.d.ts.
// ============================================================================

type Settings = {
    airplaneMode: boolean;
    streamerMode: boolean;
    apps: any;
    display: {
        brightness: number;
        size: number;
        theme: 'light' | 'dark';
        automatic: boolean;
        frameColor: string;
    };
    notifications?: {
        [key: string]: { enabled: boolean; sound: boolean };
    };
    sound: {
        volume: number;
        silent: boolean;
        texttone: string;
    };
    lockscreen: {
        color: string;
        fontStyle: number;
        layout: number;
    };
    locale: string;
    wallpaper: {
        background: string;
        blur: boolean;
    };
    time: { twelveHourClock: boolean };
    name?: string;
    version: string;
    latestVersion: string;
};

type PopUpInput = Partial<HTMLInputElement> & {
    minCharacters?: number;
    maxCharacters?: number;
    onChange?: (value: string) => void;
};

type PopUpTextarea = Partial<HTMLTextAreaElement> & {
    minCharacters?: number;
    maxCharacters?: number;
    onChange?: (value: string) => void;
};

type PopUp = {
    title: string;
    description?: string;
    vertical?: boolean;
    inputs?: PopUpInput[];
    input?: PopUpInput;
    textareas?: PopUpTextarea[];
    textarea?: PopUpTextarea;
    attachment?: { src: string };
    buttons: {
        title: string;
        cb?: () => void;
        disabled?: boolean;
        bold?: boolean;
        color?: 'red' | 'blue';
    }[];
};

type ContextMenu = {
    title?: string;
    buttons: {
        title: string;
        color?: 'red' | 'blue';
        disabled?: boolean;
        cb?: () => void;
    }[];
};

type Photo = {
    id: number;
    src: string;
    timestamp?: number;
    type?: string;
    favourite?: boolean;
    isVideo?: boolean;
    size?: number;
    duration?: number;
};

type Gallery = {
    includeVideos?: boolean;
    includeImages?: boolean;
    allowExternal?: boolean;
    multiSelect?: boolean;
    onSelect: (data: Photo) => void;
};

type ColorPicker = {
    customApp?: boolean;
    defaultColor?: string;
    onSelect: (color: string) => void;
    onClose?: (color: string) => void;
};

declare global {
    var resourceName: string;
    var appName: string;
    var settings: Settings & { [key: string]: any };

    var setApp: (app: string | { name: string; data?: any }) => void;
    var closeApp: () => void;
    var setPopUp: (popUp: PopUp) => void;
    var setFullScreenImage: (image: string) => void;
    var setContextMenu: (contextMenu: ContextMenu) => void;
    var setControlCentreVisible: (visible: boolean) => void;
    var setGallery: (options: Gallery) => void;
    var setColorPicker: (options: ColorPicker) => void;
    var setIndicatorVisible: (visible: boolean) => void;

    var fetchNui: <T = unknown>(eventName: string, data?: unknown, mockData?: T) => Promise<T>;
    var onNuiEvent: <T = unknown>(eventName: string, cb: (data: T) => void) => void;
    var useNuiEvent: <T = unknown>(eventName: string, cb: (data: T) => void) => void;
    var onSettingsChange: (cb: (settings: Settings) => void) => void;

    // invokeNative is present in the NUI frame but not in the browser.
    var invokeNative: ((name: string, ...args: any[]) => any) | undefined;
}

export {};
