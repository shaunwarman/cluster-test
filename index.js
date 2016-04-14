'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
    const numWorkers = require('os').cpus().length;

    console.log(`Master cluster setting up ${numWorkers} workers...`);

    for (var i = 0; i < numWorkers; i++) {
        let port = 8000 + i;
        cluster.fork({port: port});
    }

    cluster.on('online', (worker) => {
        console.log(`Worker ${worker.process.pid} is online`);
    });

    cluster.on('listening', (worker, address) => {
        console.log(
            `A worker is now connected to ${address.address}:${address.port}`);
    });

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
        console.log('Starting a new worker');
        cluster.fork();
    });
} else {
    const app = require('express')();

    app.all('/*', (req, res) => {
        console.log(`Process ${process.pid} requested with ${req.path}`);
        res.send(`process ${process.pid} says hello!`).end();
    });

    const server = app.listen(process.env.port, () => {
        console.log(`Process ${process.pid} is listening to all incoming requests on port ${process.env.port}`);
    });

    sendKill();
}

// kill the process after random time between 5 and 15 sec
function sendKill() {
    setTimeout(() => {
        console.log(`Killing process ${process.pid}`);
        throw new Error('Randomly killing process!');
    }, Math.random() * 10000 + 5000);
}

// catch all uncaughtExceptions
process.on('uncaughtException', (err) => {
    console.log(`${(new Date).toUTCString()} uncaughtException: ${err.message}`);
    console.log(err.stack);
    process.exit(1);
});
