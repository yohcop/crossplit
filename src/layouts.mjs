
export const layouts = {
  equal_columns: {
    _name: "Equal Columns",
    _doc:
      "All windows share the space horizontally.",
    layout: (
      _win,
      idx,
      numWindows,
      margin,
      bounds,
      _primaryCount,
      _primaryFactor
    ) => {
      const marginSpace = (numWindows + 1) * margin;
      const w = numWindows > 1
        ? (bounds.width - marginSpace) / (numWindows)
        : bounds.width - 2 * margin;
      const h = bounds.height - 2 * margin;
      return {
        top: bounds.top + margin,
        left: margin + idx * (w + margin) + bounds.left,
        width: w,
        height: h
      };
    }
  },
  primary_columns: {
    _name: "Primary Columns",
    _doc:
      "All windows share the space horizontally, full screen vertically.",
    layout: (
      _win,
      idx,
      numWindows,
      margin,
      bounds,
      _primaryCount,
      primaryFactor
    ) => {
      const primarySpace = numWindows > 1 ? (bounds.width / numWindows) * primaryFactor : bounds.width;
      const primaryW = primarySpace - 2 * margin;
      const w =
        numWindows > 1
          ? (bounds.width - primarySpace) / (numWindows - 1) - 2 * margin
          : 1;
      const h = bounds.height - 2 * margin;
      const primaryPosition =
        numWindows > 1 ? Math.floor(numWindows / 2 - 1) : 0;

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
  equal_rows: {
    _name: "Equal Rows",
    _doc:
      "All windows share the space vertically",
    layout: (
      _win,
      idx,
      numWindows,
      margin,
      bounds,
      _primaryCount,
      _primaryFactor
    ) => {
      const marginSpace = (numWindows + 1) * margin;
      const h =
        numWindows > 1
          ? (bounds.height - marginSpace) / (numWindows)
          : bounds.height - 2 * margin;
      const w = bounds.width - 2 * margin;
      return {
        top: margin + (idx) * (h + margin) + bounds.top,
        left: bounds.left + margin,
        width: w,
        height: h
      };
    }
  },
  primary_rows: {
    _name: "Primary Rows",
    _doc:
      "All windows share the space vertically, full screen horizontally.",
    layout: (
      _win,
      idx,
      numWindows,
      margin,
      bounds,
      _primaryCount,
      primaryFactor
    ) => {
      const primarySpace = numWindows > 1 ? (bounds.height / numWindows) * primaryFactor : bounds.height;
      const primaryH = primarySpace - 2 * margin;
      const h =
        numWindows > 1
          ? (bounds.height - primarySpace) / (numWindows - 1) - 2 * margin
          : 1;
      const w = bounds.width - 2 * margin;
      const primaryPosition =
        numWindows > 1 ? Math.floor(numWindows / 2 - 1) : 0;

      if (idx == 0) {  // Primary window
        return {
          top: margin + primaryPosition * (h + 2 * margin) + bounds.top,
          left: bounds.left + margin,
          width: w,
          height: primaryH
        };
      }
      if (idx > primaryPosition) {  // Windows after the primary
        return {
          top: margin + (idx - 1) * (h + 2 * margin) + primarySpace + bounds.top,
          left: bounds.left + margin,
          width: w,
          height: h
        };
      }  // Windows before the primary
      return {
        top: margin + (idx - 1) * (h + 2 * margin) + bounds.top,
        left: bounds.left + margin,
        width: w,
        height: h
      };
    }
  },
  center_primary_side_rows: {
    _name: "Center primary, side rows",
    _doc:
      "Keep a unique primary window in the center. The others divide the remaining space on the side, horizontally",
    layout: (
      _win,
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
  },
  left_primary_right_rows: {
    _name: "Left primary, right rows",
    _doc:
      "Keep a unique primary window on the left. The others divided in columns on the right",
    layout: (
      _win,
      idx,
      numWindows,
      margin,
      bounds,
      _primaryCount,
      primaryFactor
    ) => {
      const primarySpace = (bounds.width / 2) * primaryFactor;
      const primaryW = primarySpace - 2 * margin;
      const primaryH = bounds.height - 2 * margin;
      const w = (bounds.width - primarySpace) - 2 * margin;
      const h = bounds.height / Math.floor((numWindows - 1) / 2) - 2 * margin;

      if (idx == 0) {
        return {
          top: bounds.top + margin,
          left: margin + bounds.left,
          width: primaryW,
          height: primaryH
        };
      }
      return layouts.equal_rows.layout(
        _win,
        idx - 1,
        numWindows - 1,
        margin,
        {
          top: bounds.top,
          left: bounds.left + primaryW + margin,
          width: bounds.width - primarySpace + margin, // We add margin, because we only added 1 margin to left
          height: bounds.height,
        },
        0,
        1
      );
    }
  }
};

export const LAYOUT_NAMES = Object.keys(layouts);
