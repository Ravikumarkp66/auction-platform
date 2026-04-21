const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('OK'));
app.listen(5051, () => console.log('Minimal server on 5051'));
