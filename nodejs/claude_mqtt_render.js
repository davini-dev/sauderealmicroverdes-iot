// TLS/SSL configuration for MQTT using port 8883
const mqtt = require('mqtt');
const fs = require('fs');

const options = {
  host: 'your_mqtt_broker_host',  // replace with your broker's host
  port: 8883,
  protocol: 'mqtts',
  ca: fs.readFileSync('path/to/DigiCertGlobalRootG2.crt'), // specify the path to your DigiCert certificate
  // Other MQTT options can be set here
};

const client = mqtt.connect(options);

client.on('connect', () => {
  console.log('Connected to MQTT broker securely.');
});

client.on('error', (error) => {
  console.error('Connection error:', error);
});
