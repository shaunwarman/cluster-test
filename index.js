'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
    const numWorkers = require('os').cpus().length;

    console.log(`Master cluster setting up ${numWorkers} workers...`);

    for (var i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('online', (worker) => {
        console.log(`Worker ${worker.process.pid} is online`);
    });

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
        console.log('Starting a new worker');
        cluster.fork();
    });
} else {
    const app = require('express')();

    app.all('/*', (req, res) => {
        console.log('Process ' + process.pid + ' requested with ' + req.path);
        res.send(`process ${process.pid} says hello!`).end();
    });

    const server = app.listen(8000, () => {
        console.log('Process ' + process.pid + ' is listening to all incoming requests');
    });

    // kill the process after random time between 5 and 15 sec
    setTimeout(() => {
        console.log(`Killing process ${process.pid}`);
        throw new Error('Randomly killing process!');
    }, Math.random()*10000+5000);
}

// catch all uncaughtExceptions
process.on('uncaughtException', function (err) {
    console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
    console.error(err.stack);
    process.exit(1);
});
