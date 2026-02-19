const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/templates/scripts.js');

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix < tag
    // < div -> <div
    content = content.replace(/<\s+([a-zA-Z])/g, '<$1');

    // Fix </ tag
    // </ div -> </div
    content = content.replace(/<\/\s+([a-zA-Z])/g, '</$1');

    // Fix > tag with preceding space if needed (optional but good for cleanup)
    // <div ... > -> <div ...>
    // content = content.replace(/\s+>/g, '>'); // Be careful with this one, might break things like 'a > b' in JS logic. 
    // Better to stick to HTML tag closures specifically if I notice them. 
    // For now, focusing on the spaces INSIDE the tag opening which causes the browser to fail parsing.

    // Also fix attributes with excessive spaces around = 
    // style = "..." -> style="..."
    // onclick = "..." -> onclick="..."
    content = content.replace(/([a-zA-Z0-9-]+)\s+=\s+"/g, '$1="');

    // Fix end of tag spaces
    // </div > -> </div>
    content = content.replace(/<\/([a-zA-Z0-9]+)\s+>/g, '</$1>');

    // Fix start tag end spaces
    // <br > -> <br>
    // content = content.replace(/<([a-zA-Z0-9]+)\s+>/g, '<$1>');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully cleaned up scripts.js");

} catch (err) {
    console.error("Error cleaning up scripts.js:", err);
    process.exit(1);
}
