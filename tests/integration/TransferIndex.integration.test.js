const transferIndexScript = require(`${__dirname}/../../scripts/TransferIndex.js`);
const fs = require('fs');
const algoliasearch = require('algoliasearch');
const readLine = require('readline');

// Configure Algolia
const appId = process.env.ALGOLIA_TEST_APP_ID;
const apiKey = process.env.ALGOLIA_TEST_API_KEY;
const indexName = process.env.ALGOLIA_TEST_INDEX_NAME;
const altAppId = process.env.ALGOLIA_TEST_ALT_APP_ID;
const altApiKey = process.env.ALGOLIA_TEST_ALT_API_KEY;
// Test index
const client = algoliasearch(appId, apiKey);
const index = client.initIndex(indexName);
// Alternate test index
const altClient = algoliasearch(altAppId, altApiKey);
const altIndex = altClient.initIndex(indexName);

// Configure test file/directory paths
const dataPath = `${__dirname}/../mocks/users.json`;

// Mock user input
const validProgram = {
  algoliaappid: appId,
  algoliaapikey: apiKey,
  algoliaindexname: indexName,
  destinationalgoliaappid: altAppId,
  destinationalgoliaapikey: altApiKey,
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('TransferIndex command OK', () => {
  beforeAll(async done => {
    const data = fs.readFileSync(dataPath, 'utf-8');
    await altIndex.clearIndex();
    await index.clearIndex();
    await index.addObjects(JSON.parse(data));
    await wait(5000);
    done();
  }, 30000);

  test(
    'TransferIndex moves data and settings',
    done => {
      const endMsg = '\nDone transferring index.\n';

      // Mock globabl console.log() function
      // Each time it's called check if import is logging "Done" message
      // If it is done, query newly populated index to test data integrity
      global.console.log = jest.fn(async msg => {
        if (msg.match(endMsg)) {
          await wait(5000);
          const hits = await altIndex.search({ query: '', hitsPerPage: 3 });
          const hasName = hits.hits[0].hasOwnProperty('name');
          const hasGender = hits.hits[0].hasOwnProperty('gender');
          const hasLocation = hits.hits[0].hasOwnProperty('location');
          const hasEmail = hits.hits[0].hasOwnProperty('email');
          const isUser = hasName && hasGender && hasLocation && hasEmail;
          // Expectations
          expect(hits.hits).toHaveLength(3);
          expect(isUser).toBe(true);
          done();
        } else {
          readLine.cursorTo(process.stdout, 0);
          process.stdout.write(msg);
        }
      });

      // Execute transfer
      transferIndexScript.start(validProgram);
    },
    30000
  );

  afterAll(async done => {
    await index.clearIndex();
    await altIndex.clearIndex();
    done();
  }, 30000);
});
