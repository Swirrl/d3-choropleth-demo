
import express from 'express';

const port = 8000;

const app = express();

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

