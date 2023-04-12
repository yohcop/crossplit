
import { layouts } from '../src/layouts.mjs';

const bounds = {
    width: 16 * 20,
    height: 9 * 20,
    top: 0,
    left: 0,
};

const margin = 4;

const run = (layout, num) => {
    console.log(`<h2>${num} window(s)</h2>`);
    console.log("<div>");
    console.log(`<svg width="${bounds.width}" height="${bounds.height}" style="background-color:#ccc">`);
    for (let i = 0; i < num; ++i) {
        const rect = layout.layout('win_' + i, i, num, margin, bounds, /*primaryCount*/1, /*primaryFactor*/1.5);
        console.log(`<rect width="${rect.width}" height="${rect.height}" x="${rect.left}" y="${rect.top}" style="fill:rgb(100,100,255);stroke-width:1;stroke:rgb(0,0,0)" />
        <text x="${rect.left + 2}" y="${rect.top + rect.height - 2}" fill="#000">${i+1}</text>`);
    }
    console.log(`</svg>`);
    console.log("</div>");
}

const runLayout = (layout) => {
    console.log(`<h1>Layout: ${layout._name}</h1>`);
    console.log(`<p>${layout._doc}</p>`);
    for (let i = 0; i < 7; ++i) {
        run(layout, i + 1);
    }
}


console.log(`<!DOCTYPE html>
<html>
<body>
`)

runLayout(layouts.equal_columns);
runLayout(layouts.primary_columns);
runLayout(layouts.equal_rows);
runLayout(layouts.primary_rows);
runLayout(layouts.center_primary_side_rows);
runLayout(layouts.left_primary_right_rows);

console.log(`
</body>
</html>
`);