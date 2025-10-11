// dbtest.js
const path = require('path');
const fs = require('fs');

try {
    console.log('Checking if database file exists...');
    const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
    console.log(`Database path: ${dbPath}`);

    if (fs.existsSync(dbPath)) {
        console.log('Database file exists!');

        // Check if database is locked by trying to rename it temporarily
        const tempPath = `${dbPath}.temp`;
        try {
            fs.renameSync(dbPath, tempPath);
            fs.renameSync(tempPath, dbPath);
            console.log('Database is not locked (rename test succeeded).');
        } catch (error) {
            console.error('Database appears to be locked:', error.message);
        }
    } else {
        console.error('Database file does not exist at the specified path.');
    }
} catch (error) {
    console.error('Error checking database:', error.message);
}
