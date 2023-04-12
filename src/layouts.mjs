
const reverse = (bounds) => ({
  width: bounds.height, height: bounds.width, left: bounds.top, top: bounds.left
});

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
      return reverse(layouts.equal_columns.layout(_win, idx, numWindows, margin,
        reverse(bounds), _primaryCount, _primaryFactor))
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
          ? (bounds.width - primaryW - (numWindows + 1) * margin) / (numWindows - 1)
          : 1;
      const h = bounds.height - 2 * margin;
      const primaryPosition =
        numWindows > 1 ? Math.ceil(numWindows / 2 - 1) : 0;

      if (idx == 0) {
        return {
          top: bounds.top + margin,
          left: margin + primaryPosition * (w + margin) + bounds.left,
          width: primaryW,
          height: h
        };
      }
      if (idx > primaryPosition) {
        return {
          top: bounds.top + margin,
          left: (idx - 1) * (w + margin) + primarySpace + bounds.left,
          width: w,
          height: h
        };
      }
      return {
        top: bounds.top + margin,
        left: margin + (idx - 1) * (w + margin) + bounds.left,
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
      return reverse(layouts.primary_columns.layout(
        _win, idx, numWindows, margin, reverse(bounds), _primaryCount, primaryFactor
      ));
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
      if (idx <= primaryPosition) {
        return layouts.equal_rows.layout(
          _win,
          idx - 1,
          Math.ceil((numWindows - 1) / 2),
          margin,
          {
            left: bounds.left,
            top: bounds.top,
            width: bounds.width - primarySpace - w - margin,
            height: bounds.height,
          },
          0,
          1);
      }
      return layouts.equal_rows.layout(
        _win,
        idx - primaryPosition - 1,
        Math.floor((numWindows - 1) / 2),
        margin,
        {
          left: bounds.left + margin + w + primarySpace,
          top: bounds.top,
          width: bounds.width - primarySpace - w - margin,
          height: bounds.height,
        },
        0,
        1);
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
  },
  alternating_splits: {
    _name: "Alternates horizontal/vertical splits",
    _doc:
      "Splits the space horizontally (by primaryFactor), then vertically (by primaryFactor), and does that recursively",
    layout: (
      _win,
      idx,
      numWindows,
      margin,
      bounds,
      _primaryCount,
      primaryFactor
    ) => {
      return altSplitLayoutFn(_win, idx, numWindows, margin, bounds, _primaryCount, primaryFactor, 0);
    }
  }
};

export const LAYOUT_NAMES = Object.keys(layouts);

// The recursive layout function for alternating_splits.
// Moved here, because we add a new argument, splitNumber.
const altSplitLayoutFn = (
  _win,
  idx,
  numWindows,
  margin,
  bounds,
  _primaryCount,
  primaryFactor,
  splitNumber,
) => {
  const primarySpace = (bounds.width / 2) * primaryFactor;
  const primaryW = primarySpace - 2 * margin;
  const primaryH = bounds.height - 2 * margin;

  if (idx == splitNumber) {
    // This is the "primary" window of this split
    // If there are no more windows, use all the remaining space.
    if (idx == numWindows - 1) {
      return {
        top: bounds.top + margin,
        left: bounds.left + margin,
        width: bounds.width - 2 * margin,
        height: bounds.height - 2 * margin,
      };
    }
    return {
      top: bounds.top + margin,
      left: bounds.left + margin,
      width: primaryW,
      height: primaryH,
    };
  }
  return reverse(altSplitLayoutFn(
    _win,
    idx,
    numWindows,
    margin,
    reverse({
      top: bounds.top,
      left: bounds.left + primarySpace - margin,
      width: bounds.width - primarySpace + margin,
      height: bounds.height,
    }),
    _primaryCount,
    primaryFactor,
    splitNumber + 1,
  ))
}