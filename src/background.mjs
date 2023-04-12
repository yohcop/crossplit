import { layouts, LAYOUT_NAMES } from "./layouts.mjs";

const WINTYPES = { windowTypes: Object.values(chrome.windows.WindowType) };
const DEFAULT_LAYOUT = LAYOUT_NAMES[0];
const DEFAULT_PRIMARY_FACTOR = 1.2;

const listWindows = async () => {
    return new Promise((resolve, reject) => {
        chrome.windows.getAll(WINTYPES, (wins) => {
            const ws = wins
                .filter(
                    // We can't affect those (without getting them out of their
                    // minimized/fullscreen/maximized state)
                    (w) =>
                        w.state != "minimized" &&
                        w.state != "fullscreen" &&
                        w.state != "maximized"
                )
                .map((w) => ({ win: w }));

            resolve(ws);
        });
    });
};

const listDisplays = async () => {
    return new Promise((resolve, reject) => {
        chrome.system.display.getInfo((displayInfo) => {
            resolve(displayInfo.map((di) => ({ display: di })));
        });
    });
};

const locateWindow = (win, displays) => {
    const top = win.win.top;
    const left = win.win.left;
    for (const d of displays) {
        const bounds = d.display.workArea;
        if (
            bounds.top <= top &&
            bounds.top + bounds.height >= top &&
            bounds.left <= left &&
            bounds.left + bounds.width >= left
        ) {
            return d;
        }
    }
    return displays[0];
};

const relayout = (state) => {
    state.displays.forEach((d) => {
        const displaySettings = state.displaysSettings[d.display.id];
        const wins = displaySettings.winIds.map((wid) => state.windows[wid]);
        wins.forEach((win, i) => {
            const l = layouts[displaySettings.layout].layout(
                win,
                i,
                wins.length,
                15,
                d.display.workArea,
                displaySettings.primaryCount,
                displaySettings.primaryFactor
            );
            chrome.windows.update(
                win.win.id,
                {
                    top: Math.floor(l.top),
                    left: Math.floor(l.left),
                    height: Math.floor(l.height),
                    width: Math.floor(l.width)
                },
                () => { }
            );
        });
    });
};

const fetchAndUpdateState = async (state) => {
    const displays = await listDisplays();
    const windows = await listWindows();

    const displaysSettings = {};
    const winIds = windows.map((w) => w.win.id);

    displays.forEach((d) => {
        const id = d.display.id;
        if (state.displaysSettings[id]) {
            displaysSettings[id] = {
                ...state.displaysSettings[id],
                winIds: state.displaysSettings[id].winIds.filter(
                    (wid) => winIds.indexOf(wid) != -1
                )
            };
        } else {
            displaysSettings[id] = {
                primaryCount: 1,
                primaryFactor: DEFAULT_PRIMARY_FACTOR,
                layout: DEFAULT_LAYOUT,
                winIds: []
            };
        }
    });

    const winById = {};

    windows.forEach((win) => {
        winById[win.win.id] = win;
        const d = locateWindow(win, displays);
        const list = displaysSettings[d.display.id].winIds;
        if (list.indexOf(win.win.id) == -1) {
            list.push(win.win.id);
        }
        // Remove the window from other displays.
        for (const displayId of Object.keys(displaysSettings)) {
            if (displayId != d.display.id) {
                const list = displaysSettings[displayId].winIds;
                const idx = list.indexOf(win.win.id);
                if (idx != -1) {
                    list.splice(idx, 1);
                }
            }
        }
    });

    return { ...state, windows: winById, displays, displaysSettings };
};

const selectNextLayoutForScreen = (state, direction) => {
    for (const did of Object.keys(state.displaysSettings)) {
        const ds = state.displaysSettings[did];
        for (let i = 0; i < ds.winIds.length; ++i) {
            const wid = ds.winIds[i];
            if (state.windows[wid].win.focused) {
                return {
                    ...state,
                    displaysSettings: {
                        ...state.displaysSettings,
                        [did]: {
                            ...ds,
                            layout:
                                LAYOUT_NAMES[
                                (LAYOUT_NAMES.indexOf(ds.layout) + direction + LAYOUT_NAMES.length) % LAYOUT_NAMES.length
                                ]
                        }
                    }
                };
            }
        }
    }
};

const increasePrimarySize = (state, increase) => {
    for (const did of Object.keys(state.displaysSettings)) {
        const ds = state.displaysSettings[did];
        for (let i = 0; i < ds.winIds.length; ++i) {
            const wid = ds.winIds[i];
            if (state.windows[wid].win.focused) {
                return {
                    ...state,
                    displaysSettings: {
                        ...state.displaysSettings,
                        [did]: {
                            ...ds,
                            primaryFactor: ds.primaryFactor + increase,
                        }
                    }
                };
            }
        }
    }
};

const swapPrimaryWithfocussed = (state) => {
    for (const did of Object.keys(state.displaysSettings)) {
        const ds = state.displaysSettings[did];
        for (let i = 0; i < ds.winIds.length; ++i) {
            const wid = ds.winIds[i];
            if (state.windows[wid].win.focused) {
                const newOrder = [...ds.winIds];
                [newOrder[0], newOrder[i]] = [newOrder[i], newOrder[0]];
                return {
                    ...state,
                    displaysSettings: {
                        ...state.displaysSettings,
                        [did]: {
                            ...ds,
                            winIds: newOrder
                        }
                    }
                };
            }
        }
    }
    return state;
};

const moveCurrentWindow = (state, direction) => {
    for (const did of Object.keys(state.displaysSettings)) {
        const ds = state.displaysSettings[did];
        for (let i = 0; i < ds.winIds.length; ++i) {
            const wid = ds.winIds[i];
            if (
                state.windows[wid].win.focused &&
                i + direction >= 0 &&
                i + direction < ds.winIds.length
            ) {
                const newOrder = [...ds.winIds];
                [newOrder[i], newOrder[i + direction]] = [
                    newOrder[i + direction],
                    newOrder[i]
                ];
                return {
                    ...state,
                    displaysSettings: {
                        ...state.displaysSettings,
                        [did]: {
                            ...ds,
                            winIds: newOrder
                        }
                    }
                };
            }
        }
    }
    return state;
};

const newWindow = (state) => {
    console.log("New window");
    return state;
};

const windowRemoved = (state) => {
    console.log("Window removed");
    return state;
};

const focusChanged = (state) => {
    console.log("Focus changed");
    return state;
};

const commandListener = async (state, command) => {
    console.log("Command received", command);
    switch (command) {
        case "001-next-layout-for-screen": {
            const s = selectNextLayoutForScreen(await fetchAndUpdateState(state), 1);
            relayout(s);
            return s;
        }
        case "002-prev-layout-for-screen": {
            const s = selectNextLayoutForScreen(await fetchAndUpdateState(state), -1);
            relayout(s);
            return s;
        }
        case "100-move-up": {
            const s = await moveCurrentWindow(await fetchAndUpdateState(state), -1);
            relayout(s);
            return s;
        }
        case "101-move-down": {
            const s = await moveCurrentWindow(await fetchAndUpdateState(state), 1);
            relayout(s);
            return s;
        }
        case "200-increase-primary": {
            const s = increasePrimarySize(await fetchAndUpdateState(state), 0.05);
            relayout(s);
            return s;
        }
        case "201-decrease-primary": {
            const s = increasePrimarySize(await fetchAndUpdateState(state), -0.05);
            relayout(s);
            return s;
        }
        case "999-relayout": {
            const s = await fetchAndUpdateState(state);
            relayout(s);
            return s;
        }
        case "900-swap-primary":
            const s2 = await swapPrimaryWithfocussed(
                await fetchAndUpdateState(state)
            );
            relayout(s2);
            return s2;
        default:
            return state;
    }
};

const displayChanged = (state) => {
    console.log("Display changed");
    return state;
};

export const setup = async () => {
    let state = {
        displaysSettings: {}, // id => { primaryCount, primaryFactor, layout, windows: [wid] }
        windows: {}, // id => { window: {... stuff from chrome...}, layout: {x, y, w, h} }
        displays: [] // { display: {... stuff from chrome...}}
    };

    chrome.system.display.onDisplayChanged.addListener(
        () => (state = displayChanged(state))
    );
    chrome.windows.onCreated.addListener(() => (state = newWindow(state)));
    chrome.windows.onRemoved.addListener(() => (state = windowRemoved(state)));
    chrome.windows.onFocusChanged.addListener(
        () => (state = focusChanged(state))
    );
    chrome.commands.onCommand.addListener(
        async (command) => (state = await commandListener(state, command))
    );

    state = await fetchAndUpdateState(state);
};

setup();