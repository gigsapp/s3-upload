const core = require('@actions/core');
const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const s3 = new S3();
const source = core.getInput('source');
let dest = core.getInput('dest');
const bucket = core.getInput('bucket');

dest = dest === '/' ? '' : dest;

function walkSync(dir, filelist) {
  var files = fs.readdirSync(dir);
  filelist = filelist || [];

  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      filelist.push(path.join(dest, dir.replace(source, ''), file));
    }
  });

  return filelist;
}

Promise.all(
  walkSync(source).map((file) => {
    var fileType = mime.lookup(file) || 'application/octet-stream';

    return s3
      .upload({
        Body: fs.createReadStream(file),
        Bucket: bucket,
        ContentType: fileType,
        Key: file,
        ACL: 'private',
      })
      .promise();
  })
)
  .then((msg) => {
    console.log(msg);
  })
  .catch((error) => {
    core.setFailed(error.message);
  });
