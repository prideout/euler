import * as fs from "fs";
import * as marked from "marked";

const source = process.argv[2];
const target = process.argv[3];

let isIntro = true;
let inSegment = false;

const renderer = new marked.Renderer();

// Detect if we're inside a fancy segment.
renderer.html = (html) => {
    const trimmed = html.toString().trim();
    if (trimmed.startsWith("<segment")) {
        inSegment = true;
        return `${trimmed}<div>`;
    }
    if (trimmed === "</segment>") {
        inSegment = false;
        return `</div>${trimmed}`;
    }
    return trimmed;
};

// Check if the given HTML snippet is enclosed in the given tag.
const isWrapping = (text: string, tag: string): boolean => {
    const begin = `<${tag}>`;
    const end = `</${tag}>`;
    if (!text.startsWith(begin) || !text.endsWith(end)) {
        return false;
    }
    // NOTE: We're not checking that there is only 1 instance of begin / end.
    return true;
};

// Wrap each h2 section with a panel div.
let h2index = 0;
renderer.heading = (text, level) => {
    const d = '\n<div class="panel">';
    if (level !== 2) {
        return `<h${level}>${text}</h${level}>\n`;
    }
    const h = `<h2 id="h${h2index}">${text}</h${level}>\n`;
    h2index = h2index + 1;
    if (text === "last") {
        return "</div>";
    }
    if (!isIntro) {
        return `</div>\n${d}\n${h}`;
    }
    isIntro = false;
    return `\n${d}\n${h}`;
};

// Add center tags to all-italic or all-bold paragraphs.
// Also wrap each paragraph with a fixed-height segment.
renderer.paragraph = (text) => {
    text = text.replace(/\n/g, " ");
    if (isWrapping(text, "em") || isWrapping(text, "strong")) {
        return `<p class="center">${text}</p>\n`;
    }
    if (!isIntro && !inSegment) {
        return `<segment><p>${text}</p></segment>\n`;
    }
    return `<p>${text}</p>\n`;
};

const markdownSource = fs.readFileSync(source, "utf8");

const innerHtml = marked(markdownSource, { renderer }) + "</div>\n";

const generatedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<title>Euler's Polyhedron Formula</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="favicon.png" rel="icon" type="image/x-icon" />
<link href="https://fonts.googleapis.com/css?family=Alegreya" rel="stylesheet">
<link href="style.css" rel="stylesheet">
</head>
<body>
<div class="container constrain" tabindex="0">
<div>
${innerHtml}
</div>
</div>
<script src="main.js" type="module"></script>
</body>
`;

fs.writeFileSync(target, generatedHtml, "utf8");

console.info(`Generated ${target}`);
