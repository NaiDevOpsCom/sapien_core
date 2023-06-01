var express = require('express');
var router = express.Router();
var controller = require('../controllers/api_controller');
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.sendStatus(401) // if there isn't any token

    jwt.verify(token, 'secretkey', (err, user) => {
        console.log(err)

        if (err) return res.sendStatus(403)
        req.user = user
        next() // pass the execution off to whatever request the client intended
    })
}

module.exports = (app) => {
    router.get('/health_check',controller.health_check) // System health Checker

    router.post('/register',controller.register)
    
    router.post('/login',controller.login)
    
    router.post('/forgot_password',controller.forgotPassword)

    router.post('/reset_password',controller.resetPassword)
    
    router.get('/get_user/:email',authenticateToken,controller.getUser)

    router.patch('/update_user',authenticateToken,controller.updateUser)

    router.patch('/update_plan',authenticateToken,controller.updatePlan)

    router.post('/create_user_app',authenticateToken,controller.createUserApp)

    router.post('/check_app_name',authenticateToken,controller.checkUserAppName)

    router.get('/get_user_apps',authenticateToken,controller.getUserApps)

    router.get('/get_app/:app_id',authenticateToken,controller.getApp)

    router.get('/get_app_by_name/:app_name',authenticateToken,controller.getAppByName)


    router.patch('/update_app/:app_id',authenticateToken,controller.updateApp)

    router.delete('/delete_app/:app_id',authenticateToken,controller.deleteApp)

    //audit
    router.get('/app_audit/:app_id',authenticateToken,controller.appAuditLog)

    router.get('/user_audit',authenticateToken,controller.userAuditLog)

    //feedback
    router.post('/feedback',authenticateToken,controller.feedback)
    
    return router
}
