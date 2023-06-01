const express = require('express');
const router = express.Router();
const gateway = require('../controllers/gateway_controller');

module.exports = (app) => {
    router.get('/:serviceName/:path(*)', gateway.gatewayController)
    router.post('/:serviceName/:path(*)', gateway.gatewayController)
    router.put('/:serviceName/:path(*)', gateway.gatewayController)
    router.patch('/:serviceName/:path(*)', gateway.gatewayController)
    router.delete('/:serviceName/:path(*)', gateway.gatewayController)

    return router
}
