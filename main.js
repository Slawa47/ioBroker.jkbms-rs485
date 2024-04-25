'use strict';

const utils = require('@iobroker/adapter-core');
const net = require('net');
// Load your modules here, e.g.:
// const fs = require("fs");

class JkbmsRs485 extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'jkbms-rs485',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info('config IP: ' + this.config.ip);
        this.log.info('config Port: ' + this.config.port);
        this.log.info('config updateInterval: ' + this.config.updateInterval);

        await this.setObjectNotExistsAsync('testVariable', {
            type: 'state',
            common: {
                name: 'testVariable',
                type: 'boolean',
                role: 'indicator',
                read: true,
                write: true,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('BMS_Antwort', {
            type: 'state',
            common: {
                name: 'BMS_Antwort',
                type: 'string',
                role: 'state',
                read: true,
                write: true,
            },
            native: {},
        });

        // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
        this.subscribeStates('testVariable');
        // the variable testVariable is set to true as command (ack=false)
        await this.setStateAsync('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        await this.setStateAsync('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

        // examples for the checkPassword/checkGroup functions
        let result = await this.checkPasswordAsync('admin', 'iobroker');
        this.log.info('check user admin pw iobroker: ' + result);

        result = await this.checkGroupAsync('admin', 'admin');
        this.log.info('check group user admin group admin: ' + result);

        //const host = '192.168.0.27';
        //const port = 502;
        const message = Buffer.from('01 10 16 20 00 01 02 00 00 D6 F1'.replace(/\s/g, ''), 'hex');
        function sendData(socket) {
            socket.write(message);
        }

        const client = new net.Socket();

        client.connect(this.config.port, this.config.ip, () => {
            console.log('Verbunden mit dem Server');

            // Daten senden alle 10 Sekunden
            setInterval(() => {
                sendData(client);
            }, this.config.updateInterval);
        });

        client.on('data', (data) => {
            console.log('Antwort erhalten:', data.toString('hex'));
            this.bmsAntwort = data.toString('hex');
            if (this.bmsAntwort.length > 50) {
                this.setStateAsync('BMS_Antwort', { val: data.toString('hex'), ack: true });
            }
        });

        client.on('close', () => {
            console.log('Verbindung geschlossen');
        });

        client.on('error', (err) => {
            console.error('Fehler:', err);
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }
}

const host = '192.168.0.27';
const port = 502;
const message = Buffer.from('01 10 16 20 00 01 02 00 00 D6 F1'.replace(/\s/g, ''), 'hex');
function sendData(socket) {
    socket.write(message);
}

const client = new net.Socket();

client.connect(port, host, () => {
    console.log('Verbunden mit dem Server');

    // Daten senden alle 10 Sekunden
    setInterval(() => {
        sendData(client);
    }, 10000);
});

client.on('data', (data) => {
    console.log('Antwort erhalten:', data.toString('hex'));
});

client.on('close', () => {
    console.log('Verbindung geschlossen');
});

client.on('error', (err) => {
    console.error('Fehler:', err);
});

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new JkbmsRs485(options);
} else {
    // otherwise start the instance directly
    new JkbmsRs485();
}
