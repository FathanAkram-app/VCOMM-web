// Quick script to manually provision Gotify tokens for users
// Run with: node test-provision-tokens.js inside the Docker container

const { gotifyService } = require('./dist/services/gotify.service');
const { storage } = require('./dist/storage');

async function provisionTokens() {
    try {
        console.log('Provisioning Gotify tokens for users...');

        // User 1 (TES12)
        console.log('\nUser 1 (TES12):');
        const token1 = await gotifyService.ensureUserHasToken(1, 'TES12');
        console.log('Token created:', token1 ? 'YES' : 'FAILED');

        // User 2 (TES13)
        console.log('\nUser 2 (TES13):');
        const token2 = await gotifyService.ensureUserHasToken(2, 'TES13');
        console.log('Token created:', token2 ? 'YES' : 'FAILED');

        console.log('\nDone! Tokens provisioned.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

provisionTokens();
