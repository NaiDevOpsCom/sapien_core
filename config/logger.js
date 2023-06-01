const graylog2 = require('graylog2');

exports.logger =new graylog2.graylog({
    hostname:"Sapien-Gateway",
    servers: [{ host: 'ec2-13-40-159-87.eu-west-2.compute.amazonaws.com', port: 5555 }] // Replace the "host" per your Graylog domain
  });