/* eslint-env amd, node */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

const imported = require('./node_modules/@vlsergey/js-config/src/karma');
const path = require('path');

module.exports = function (config) {
  imported(config);

  config.set({
    files: [
      'test/**/*Test.ts',
    ],

    webpack: {
      ...config.webpack,
      output: {
        path: path.resolve(__dirname, 'lib-test'),
      },
    }
  });
};
