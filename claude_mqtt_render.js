// MQTT Client Configuration with TLS

const mqtt = require('mqtt');

// Define the MQTT broker URL and options
const options = {
    port: 8883,
    host: 'your_mqtt_broker_address',  // Replace with your broker address
    protocol: 'mqtts',
    rejectUnauthorized: false,
    key: fs.readFileSync('path_to_your_key.pem'), // Your private key
    cert: fs.readFileSync('path_to_your_cert.pem'), // Your client certificate
    ca: fs.readFileSync('path_to_digicert_global_root_g2.pem') // DigiCert Global Root G2 certificate
};

// Connect to the MQTT broker
const client = mqtt.connect(options);

client.on('connect', () => {
    console.log('Connected to MQTT Broker');
});

client.on('error', (err) => {
    console.error('Connection Error:', err);
});