const WINTYPES = { windowTypes: Object.values(chrome.windows.WindowType) };

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

const layouts = {
  columns: {
    _doc:
      "Keep a unique primary window in the center. The others divide the remaining space on the side, vertically",
    layout: (
      win,
      idx,
      numWindows,
      margin,
      bounds,
      _primaryCount,
      primaryFactor
    ) => {
      const primarySpace = (bounds.width / numWindows) * primaryFactor;
      const primaryW = primarySpace - 2 * margin;
      const w =
        numWindows > 1
          ? (bounds.width - primarySpace) / (numWindows - 1) - 2 * margin
          : 1;
      const h = bounds.height - 2 * margin;
      const primaryPosition =
        numWindows > 1 ? Math.floor(numWindows / 2 - 1) : 1;

      if (idx == 0) {
        return {
          top: bounds.top + margin,
          left: margin + primaryPosition * (w + 2 * margin) + bounds.left,
          width: primaryW,
          height: h
        };
      }
      if (idx > primaryPosition) {
        return {
          top: bounds.top + margin,
          left:
            margin + (idx - 1) * (w + 2 * margin) + primarySpace + bounds.left,
          width: w,
          height: h
        };
      }
      return {
        top: bounds.top + margin,
        left: margin + (idx - 1) * (w + 2 * margin) + bounds.left,
        width: w,
        height: h
      };
    }
  },
  column_and_rows: {
    _doc:
      "Keep a unique primary window in the center. The others divide the remaining space on the side, horizontally",
    layout: (
      win,
      idx,
      numWindows,
      margin,
      bounds,
      _primaryCount,
      primaryFactor
    ) => {
      const primarySpace = (bounds.width / 3) * primaryFactor;
      const primaryW = primarySpace - 2 * margin;
      const w = (bounds.width - primarySpace) / 2 - 2 * margin;
      const primaryH = bounds.height - 2 * margin;
      const primaryPosition = Math.floor(numWindows / 2);

      if (idx == 0) {
        return {
          top: bounds.top + margin,
          left: margin + w + 2 * margin + bounds.left,
          width: primaryW,
          height: primaryH
        };
      }
      if (idx > primaryPosition) {
        const h = bounds.height / Math.floor((numWindows - 1) / 2) - 2 * margin;
        return {
          top:
            bounds.top +
            margin +
            (idx - 1 - primaryPosition) * (h + 2 * margin),
          left: bounds.left + w + 2 * margin + primarySpace + margin,
          width: w,
          height: h
        };
      }
      const h = bounds.height / Math.ceil((numWindows - 1) / 2) - 2 * margin;
      return {
        top: bounds.top + margin + (idx - 1) * (h + 2 * margin),
        left: margin + bounds.left,
        width: w,
        height: h
      };
    }
  }
};

const LAYOUT_NAMES = Object.keys(layouts);

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
        () => {}
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
        primaryFactor: 1.3,
        layout: "column_and_rows",
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

const selectNextLayoutForScreen = (state) => {
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
                  (LAYOUT_NAMES.indexOf(ds.layout) + 1) % LAYOUT_NAMES.length
                ]
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
      const s = selectNextLayoutForScreen(await fetchAndUpdateState(state));
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

const setup = async () => {
  let state = {
    layout: "columns",
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
