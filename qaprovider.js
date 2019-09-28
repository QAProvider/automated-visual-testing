const puppeteer = require('puppeteer');
const fs = require('fs'); // module to work with file system
const { imgDiff } = require('img-diff-js'); // module to compare images
let errors = 0;

(async () => {
    let urls = JSON.parse(fs.readFileSync('config.json')); // Read config file

    // Define all view ports sizes to be tested
    let viewPorts = [
        { width: 1024, height: 768 },
        { width: 800, height: 600 },
        { width: 640, height: 480 },
    ];

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Run through the all urls to be tested
    for (let ind in urls) {
        // Run through all view port sizes
        for (let ivp in viewPorts) {
            let width = viewPorts[ivp].width;
            let height = viewPorts[ivp].height;
            let size = width + 'x' + height;

            console.log('Test url ' + urls[ind].url + ', viewport[' + size + ']');
            await page.goto(urls[ind].url, {waitUntil: 'load', timeout: 60000});
            await page.setViewport({width: width, height: height});

            let fileName = urls[ind].screen_name + size + '.png';
            let etalonFileName = urls[ind].screen_name + size + '_etalon.png';
            let diffFileName = urls[ind].screen_name + size + '_diff.png';

            await page.screenshot({path: 'screenshots/' + fileName, fullPage: true});
            console.log(' Screenshot created: ' + fileName);

            if (fs.existsSync('screenshots/' + etalonFileName)) {
                console.log(' Comparing with etalon:');
                console.log('  Actual: ' + 'screenshots/' + fileName);
                console.log('  Etalon: ' + 'screenshots/' + etalonFileName);
                console.log('  Diff: ' + 'screenshots/' + diffFileName);

                await compare(page, fileName, etalonFileName, diffFileName);
            } else {
                console.log(' No verified screenshot found. Will be used as verified screenshot');
                await fs.createReadStream('screenshots/' + fileName).pipe(fs.createWriteStream('screenshots/' + etalonFileName));
            }
        }
    }

  await browser.close();
})();

async function compare(page, fileName, etalonFileName, diffFileName) {
    if (fs.existsSync('screenshots/' + diffFileName)) {
        await fs.unlinkSync('screenshots/' + diffFileName);
    }

    let result = await imgDiff({
        actualFilename: 'screenshots/' + fileName,
        expectedFilename: 'screenshots/' + etalonFileName,
        diffFilename: 'screenshots/' + diffFileName,
    });

    console.log('  Diff count = ' + result.diffCount);
    if (result.diffCount > 0) {
        errors++;
        console.log(' FAILED screenshot test! Page:' + page);
        console.log(' Currently found ' + errors + ' errors');
    } else {
        fs.unlinkSync('screenshots/' + diffFileName);
        console.log(' SUCCESS! Diff file will be removed, success result!');
    }
}
