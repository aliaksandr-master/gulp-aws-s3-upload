[![npm](http://img.shields.io/npm/v/gulp-aws-s3-upload.svg?style=flat-square)](https://www.npmjs.com/package/gulp-aws-s3-upload)
[![npm](http://img.shields.io/npm/l/gulp-aws-s3-upload.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![Dependency Status](https://david-dm.org/aliaksandr-master/gulp-aws-s3-upload.svg?style=flat-square)](https://david-dm.org/aliaksandr-master/gulp-aws-s3-upload)
[![devDependency Status](https://david-dm.org/aliaksandr-master/gulp-aws-s3-upload/dev-status.svg?style=flat-square)](https://david-dm.org/aliaksandr-master/gulp-aws-s3-upload#info=devDependencies)

gulp-aws-s3-upload
================

## install

```
npm install gulp-aws-s3-upload -S
```

configurable gulp task for uploading to aws-s3 bucket

## USAGE
```js
'use strict';

const gulp = require('gulp');
const gulpGzip = require('gulp-gzip');
const gulpFilter = require('gulp-filter');
const gulpAwsS3Upload = require('gulp-aws-s3-upload');

gulp.task(() => {
  const filterGzipFiles = gulpFilter([ '**/*.{css,js}' ], { restore: true });

  return gulp
    .src([
      '**/*'
    ])

    .pipe(filterGzipFiles)
    .pipe(gulpGzip())
    .pipe(filterGzipFiles.restore)

    .pipe(gulpAwsS3Upload({
      onlyNew: process.NODE_ENV !== 'production',
      cache: '.tmp/s3-cache.json',
      headers: { 
          'Cache-Control': 'max-age=864000, s-maxage=864000, must-revalidate',
          'x-amz-acl': 'public-read' // don't forget this header if this files are public!
      },
      aws: {
        key: '...',
        secret: '...',
        bucket: '...'
      }
    }));
});
```

## options

### options.onlyNew
- if true uploader will upload only new files (use cache)
Default: `false`,

### options.cacheFile
- file path for cache storage
Default: `null`

### options.cacheByFileName
- mode for cache
Default: 'false'

### options.aws
- credentials for s3 bucket
Default: `{}` - required

key: '...',
secret: '...',
bucket: '...'


### options.uploadPath
Default: `''`

### options.headers
Default: `{ 'x-amz-acl': 'public-read' }`
