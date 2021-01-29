const core = require('@actions/core');
const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const s3 = new S3();
const source = core.getInput('source');
let dest = core.getInput('dest');
const bucket = core.getInput('bucket');

function walkSync(dir, filelist) {
  var files = fs.readdirSync(dir);
  filelist = filelist || [];

  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      filelist.push(path.join(dir, file));
    }
  });

  return filelist;
}

Promise.all(
  walkSync(source).map((file) => {
    const fileType = mime.lookup(file) || 'application/octet-stream';
    const key = `${dest === '/' ? '' : dest + '/'}${file.replace(
      `${source}/`,
      ''
    )}`;
    return s3
      .upload({
        Body: fs.createReadStream(file),
        Bucket: bucket,
        ContentType: fileType,
        Key: key,
        ACL: 'private',
      })
      .promise();
  })
)
  .then((msg) => {
    console.log(msg.key);
  })
  .catch((error) => {
    core.setFailed(error.message);
  });
