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

Configurable gulp task for uploading to aws-s3 bucket

## USAGE
```js
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
Default: `false`

if true uploader will upload only new files (use cache)

### options.public
Default: `true`

uploader additionally set header `'x-amz-acl': 'public-read'`

### options.cacheFile
Default: `null`

file path for caching file 


### options.cacheByFileName
Default: `false`

mode for cache


### options.aws
Default: `{}` - required

credentials for s3 bucket.
- key: '...',
- secret: '...',
- bucket: '...',
- or other props that are used by library [knox](https://github.com/Automattic/knox)


### options.uploadPath
Default: `''`

### options.headers
Default: `{}`
