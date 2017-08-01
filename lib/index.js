'use strict';

const through = require('through2');
const knox = require('knox');
const merge = require('lodash/merge');
const assign = require('lodash/assign');
const cloneDeep = require('lodash/cloneDeep');
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

  if (_options.public) {
    _options.headers = assign({ 'x-amz-acl': 'public-read' }, _options.headers || {});
  }

  const client = knox.createClient(_options.aws);
  const cache = cacheByFile(_options.cacheFile, { byFileName: Boolean(_options.cacheByFileName) });

  const uploadToS3 = (file, uploadPath, options, done) => {
    client.putBuffer(file.contents, uploadPath, options.headers, (err, res) => {
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
    client.headFile(uploadPath, (err, res) => {
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
      options.headers['Content-Encoding'] = 'gzip';
      uploadPath = uploadPath.substring(0, uploadPath.length - 3);
    }

    if (!options.headers['Content-Type'] && /\.([a-z]{2,})$/i.test(uploadPath)) {
      options.headers['Content-Type'] = mime.lookup(uploadPath);
    }

    options.headers['Content-Length'] = file.stat.size;

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
