'use strict';

const cluster = require('cluster');
const ports = require('./config/config').ports;

if (cluster.isMaster) {
    const numWorkers = require('os').cpus().length;
    const cache = {};

    console.log(`Master cluster setting up ${numWorkers} workers...`);

    ports.forEach((port) => {
        // fork with unique port
        const worker = cluster.fork({ port: port });
        const workerId = `${worker.id}`;

        cache.availablePorts = cache.availablePorts  || {};
        cache.availablePorts[workerId] = port;
    });

    cluster.on('message', (msg) => {
        console.log(`Message received from ${msg.worker} on port ${msg.port}` );
        const key = `${msg.worker}`;
        const value = msg.port;

        cache.availablePorts[key] = value;
        console.log(`Cache from message: ${JSON.stringify(cache)}`);
    });

    cluster.on('online', (worker) => {
        console.log(`Worker ${worker.id} is online`);
    });

    cluster.on('listening', (worker, address) => {
        console.log(
            `A worker is now connected to ${address.address}:${address.port}`);
    });

    cluster.on('exit', (worker, code, signal) => {
        const usePort = cache.availablePorts[worker.id];
        delete cache.availablePorts[worker.id];

        console.log(`Worker ${worker.id} deleted from cache: ${JSON.stringify(cache)}`);
        console.log(`Worker ${worker.id} died with code: ${code}, and signal: ${signal}`);
        cluster.fork({ port: usePort });
    });
} else {
    const app = require('express')();

    app.all('/*', (req, res) => {
        console.log(`Process ${process.pid} requested with ${req.path}`);
        res.send(`process ${process.pid} says hello!`).end();
    });

    const server = app.listen(process.env.port, () => {
        console.log(`Process ${cluster.worker.id} on pid ${process.pid} is listening to all incoming requests on port ${process.env.port}`);
        process.send({ worker: cluster.worker.id, port: process.env.port });
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
