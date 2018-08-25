const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

app
  .use('*', (req, res) => res.json({status: 'OK'}).status(200));

// Start Server
app.listen(port, () => console.log(`Server running on :${port}`));
