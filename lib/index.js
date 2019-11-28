'use strict';

const through = require('through2');
const AWS = require('aws-sdk');
const merge = require('lodash/merge');
const cloneDeep = require('lodash/cloneDeep');
const assign = require('lodash/assign');
const isEmpty = require('lodash/isEmpty');
const gutil = require('gulp-util');
const cacheByFile = require('./cache-by-file');
const mime = require('mime');
const path = require('path');
const chalk = require('chalk');


module.exports = (_options) => {
  _options = merge({
    onlyNew: false,
    cwd: process.cwd(),
    cacheFile: null,
    cacheByFileName: false,
    aws: {},
    uploadPath: '',
    public: true,
    headers: {}
  }, _options);

  const cache = cacheByFile(_options.cacheFile, { byFileName: Boolean(_options.cacheByFileName) });
  const client = new AWS.S3({
    apiVersion: 'latest',
    accessKeyId: _options.aws.key,
    secretAccessKey: _options.aws.secret,
    region: _options.aws.region
  });

  const uploadToS3 = (file, uploadPath, options, done) => {
    let uploadParams = {
      Bucket: _options.aws.bucket,
      Key: uploadPath.replace(/^\//g, ''),
      Body: file.contents
    };

    if (!isEmpty(options.headers)) {
      uploadParams = assign(uploadParams, options.headers);
    }

    if (_options.public) {
      uploadParams.ACL = 'public-read';
    }

    client.upload(uploadParams, (err, res) => {
      if (err) {
        done(err);
        return;
      }

      err = Number(res.statusCode) !== 200 ? err || res.statusCode : null;

      if (err) {
        done(new gutil.PluginError('gulp-upload-new-s3', {
          name: 'gulpUploadNewS3Error',
          message: err
        }));
        return;
      }

      done(null);
    });
  };

  const ifNotFoundInS3 = (file, uploadPath, options, callback) => {
    client.getObject({
      Bucket: _options.aws.bucket,
      Key: uploadPath.replace(/^\//g, '')
    }, (err, res) => {
      if (err) {
        callback(err);
        return;
      }

      if (Number(res.statusCode) !== 404) {
        callback(null, true);
        return;
      }

      callback(null, false);
    });
  };


  return through.obj((file, encoding, taskDone) => {
    if (!file.isBuffer()) {
      taskDone(null, file);
      return;
    }

    const options = cloneDeep(_options);

    let uploadPath = file.path.replace(file.base, options.uploadPath).replace(/\\/g, '/');

    if (/\.gz$/i.test(uploadPath)) {
      options.headers.ContentEncoding = 'gzip';
      uploadPath = uploadPath.substring(0, uploadPath.length - 3);
    }

    if (!options.headers.ContentType && /\.([a-z]{2,})$/i.test(uploadPath)) {
      options.headers.ContentType = mime.getType(uploadPath);
    }

    const fileMessage = path.relative(options.cwd, file.path) + chalk.gray(' -> ') + uploadPath;

    const error = (err) => {
      gutil.log(`${chalk.red('[FAILED]')} ${fileMessage} :: ${chalk.red(err.message || err)}`);
    };

    const upload = () => {
      uploadToS3(file, uploadPath, options, (err) => {
        if (err) {
          error(err);
        } else {
          gutil.log(`${chalk.green('[SUCCESS]')} ${fileMessage}`);
          cache.remember(file);
        }

        taskDone(err, file);
      });
    };

    const onlyNew = typeof options.onlyNew === 'function' ? Boolean(options.onlyNew(file.path)) : Boolean(options.onlyNew);

    if (onlyNew) {
      if (cache.isTheSame(file)) {
        gutil.log(`${chalk.gray('[CACHED]')} ${fileMessage}`);
        taskDone(null, file);
        return;
      }

      ifNotFoundInS3(file, uploadPath, options, (err, exists) => {
        if (err) {
          error(err);
          taskDone(err, file);
          return;
        }

        if (exists) {
          cache.remember(file);
          gutil.log(`${chalk.gray('[SKIPPED]')} ${fileMessage}`);
          taskDone(null, file);
          return;
        }

        upload();
      });
      return;
    }

    upload();
  });
};
