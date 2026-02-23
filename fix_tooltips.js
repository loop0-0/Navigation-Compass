const fs = require('fs');
let html = fs.readFileSync('src/app/components/charts/charts.component.html', 'utf8');

// Use focus-within for toggle
html = html.replace(/group-hover:opacity-100 group-hover:visible/g, 'group-focus-within:opacity-100 group-focus-within:visible');

// Add tabindex and focus classes to SVG for proper click focusing
html = html.replace(/<svg\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"([\s\S]*?)class="([^"]*?)cursor-help([^"]*?)"/g, (match, p1, p2, p3) => {
    let newClass = p2 + 'cursor-pointer outline-none ' + p3;
    newClass = newClass.replace(/group-hover:text-([^ ]+)/, 'group-focus-within:text-$1');
    return '<svg tabindex="0" xmlns="http://www.w3.org/2000/svg"' + p1 + 'class="' + newClass.trim() + '"';
});

fs.writeFileSync('src/app/components/charts/charts.component.html', html);
console.log('done');
