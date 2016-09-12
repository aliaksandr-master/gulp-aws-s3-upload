'use strict';

const gutil = require('gulp-util');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const encryptSHA1 = require('crypto-js/sha1');


exports.error = (file, message) =>
  new gutil.PluginError('gulp-plugin-error', {
    name: 'GulpPluginError',
    message: `${chalk.red(message)} in file "/${path.relative(process.cwd(), file.path)}"`
  });


const Cache = (filePath) => {
  const cache = {};
  let _cacheObject = {};
  let _init = false;

  cache.init = () => {
    if (!filePath || _init) {
      return;
    }

    _init = true;

    fse.ensureFileSync(filePath);

    const cacheFileContent = fs.readFileSync(filePath, 'utf8');

    _cacheObject = cacheFileContent ? JSON.parse(cacheFileContent) : {};
  };

  cache.set = (key, value, mustSave) => {
    cache.init();

    if (cache.get(key) === value) {
      return true;
    }

    _cacheObject[key] = value;

    if (mustSave || mustSave == null) {
      return cache.save();
    }

    return true;
  };

  cache.get = (key) => {
    cache.init();

    return _cacheObject[key];
  };

  cache.save = () => {
    if (!filePath) {
      return false;
    }

    cache.init();

    fs.writeFileSync(filePath, JSON.stringify(_cacheObject, null, 4), { encoding: 'utf8' });

    return true;
  };

  return cache;
};


module.exports = (cacheFilePath, options = {}) => {
  const cache = Cache(cacheFilePath);

  const getFileModStemp = (file) => {
    if (!file.stat) {
      return null;
    }

    if (options.byFileName) {
      return file.path;
    }

    const content = file.contents.toString();

    return `${encryptSHA1(content).toString()}-${content.length}-${String(file.stat.size)}`;
  };

  const fileCache = {};

  fileCache.forget = (file) => cache.set(file.path, undefined, true);

  fileCache.remember = (file) => {
    const mod = getFileModStemp(file);

    return mod ? cache.set(file.path, mod, true) : false;
  };

  fileCache.isTheSame = (file) => {
    const mod = getFileModStemp(file);
    const cacheVal = cache.get(file.path);

    return mod && cacheVal ? mod === cacheVal : false;
  };

  return fileCache;
};
