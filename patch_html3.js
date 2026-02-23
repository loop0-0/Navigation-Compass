const fs = require('fs');
let html = fs.readFileSync('src/app/components/charts/charts.component.html.bak', 'utf8');
const replacement = fs.readFileSync('new_d1_html.html', 'utf8');

const startStr = "<ng-container *ngIf=\"mode === 'global'\">";
const endStr = "<!-- STATION PANEL: FOCUS STATION (Mode Station)";

const startIndex = html.indexOf(startStr);
const endIndex = html.indexOf(endStr);

if (startIndex > -1 && endIndex > -1) {
    const textToReplace = html.substring(startIndex, endIndex);
    const lastNgContainerIndex = textToReplace.lastIndexOf('</ng-container>');

    if (lastNgContainerIndex > -1) {
        const fullReplaceEnd = startIndex + lastNgContainerIndex + '</ng-container>'.length;
        html = html.substring(0, startIndex) + replacement + html.substring(fullReplaceEnd);
        fs.writeFileSync('src/app/components/charts/charts.component.html', html);
        console.log('Successfully injected new flattened HTML');
    } else {
        console.log('Could not find closing ng-container', textToReplace);
    }
} else {
    console.log('Could not find boundaries', startIndex, endIndex);
}
