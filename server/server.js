require('./database'); // init DB on startup
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/products',   require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/contact',    require('./routes/contact'));
app.use('/api/carousel',   require('./routes/carousel'));
app.use('/api/upload',     require('./routes/upload'));
app.use('/api/translate',  require('./routes/translate'));

// SPA fallback for service pages
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => console.log(`MAJUDROSIBA server running on port ${PORT}`));
