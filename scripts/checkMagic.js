import fs from 'fs';
const buffer = fs.readFileSync('test_avatar.jpg');
console.log('Bytes:', buffer.subarray(0, 10).toString('hex'));
