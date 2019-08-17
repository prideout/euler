const path = require('path');
const webpack = require('webpack');

'use strict';

module.exports = {
    devtool: 'source-map',
    entry: './src/app.ts',

    // We do not actually use the following modules, but emscripten emits JS bindings that
    // conditionally uses them. Therefore we need to tell webpack to skip over their "require"
    // statements.
    externals: {
        fs: 'fs',
        crypto: 'crypto',
        path: 'path'
    },

    output:  {
        path: path.resolve(__dirname, 'docs')
    },

    module: {
        rules: [
            { test: /\.tsx?$/, loader: 'ts-loader' }
        ]
    },

    resolve: {
        extensions: [ '.ts', '.tsx', '.js' ],

        // This must be consistent with tsconfig.json:
        alias: {
          'filament': path.resolve(__dirname, 'filament/filament'),
        }
    },

    performance: {
        assetFilter: function(assetFilename) {
            return false;
        }
    },

    plugins: [
        new webpack.DefinePlugin({
            "BUILD_COMMAND": JSON.stringify(process.env.npm_lifecycle_event),
        })
    ]
};
