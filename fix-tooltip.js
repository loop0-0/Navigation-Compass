const fs = require('fs');
let html = fs.readFileSync('src/app/components/charts/charts.component.html', 'utf8');

// The pattern:
// 1. A container usually has `group`
// 2. An SVG icon with `cursor-help transition-colors group-hover:text-[#1D4ED8]`
// 3. A tooltip div starting with `class="absolute opacity-0 invisible group-hover:opacity-100 group-hover:visible`
// 4. A little triangle inside it

// Let's replace the SVG first:
let idCounter = 1;
const regexSvg = /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^\n]*\n[^\n]*class="[^"]*cursor-help[^\n]*\n[^\n]*\n[ \t]*<\/svg>/g;
// Actually, it's safer to just replace 'cursor-help transition-colors group-hover:text-[#1D4ED8]' inside the SVGs
// and manually insert the (click)="toggleTooltip('ttX', $event)" 
// But the tooltips are in the exact same DOM tree. 
// A single RegExp matching the whole block might be too fragile.

// Let's do a simple split by `cursor-help`
let parts = html.split('cursor-help transition-colors group-hover:text-[#1D4ED8]');
let newHtml = parts[0];

for (let i = 1; i < parts.length; i++) {
    let ttId = 'tt_' + i;

    // The previous part ends with `class="h-4 w-4 text-gray-400 `
    // We want to insert ` (click)="toggleTooltip('tt_X', $event)" ` before the `class=`
    // Looking backwards for the `<svg `
    let prefix = newHtml;
    let svgIndex = prefix.lastIndexOf('<svg ');
    newHtml = prefix.substring(0, svgIndex) + `<svg (click)="toggleTooltip('${ttId}', $event)" ` + prefix.substring(svgIndex + 5);

    // Replace the class attributes
    newHtml += 'cursor-pointer transition-colors hover:text-[#1D4ED8]';

    // Now for the next tooltip div.
    // It's in parts[i]
    // Find the first `group-hover:opacity-100 group-hover:visible`
    parts[i] = parts[i].replace('opacity-0 invisible group-hover:opacity-100 group-hover:visible',
        `[class.opacity-100]="activeTooltip === '${ttId}'" [class.visible]="activeTooltip === '${ttId}'" [class.opacity-0]="activeTooltip !== '${ttId}'" [class.invisible]="activeTooltip !== '${ttId}'"`);

    newHtml += parts[i];
}

fs.writeFileSync('src/app/components/charts/charts.component.html', newHtml);
console.log("Replaced tooltips: " + (parts.length - 1));
