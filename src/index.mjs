
import blobs from '@azure/storage-blob';

import express from 'express';

// express < 5 can't handle async exceptions in handlers
import 'express-async-errors';

const port = process.env.PORT || 8000;

const blobService = blobs.BlobServiceClient.fromConnectionString(process.env.MAPDEMO_BLOB_CONNECTION);
const blobContainer = blobService.getContainerClient(process.env.MAPDEMO_BLOB_CONTAINER);

const app = express();

app.use(express.static('public'));

app.get('/data/:file', async (req, res) => {
    let blobClient = blobContainer.getBlockBlobClient(`${process.env.MAPDEMO_BLOB_DIR}/${req.params.file}`);
    (await blobClient.download()).readableStreamBody.pipe(res);
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

