const service = require('../services/api_services');
const { logger } = require('../config/logger');

exports.health_check = async(req, res) => {
    return res.status(200).json({
        message: 'Welcome to the SAPIEN API',
        data:"All is well"
    })
}


exports.register = async(req, res) => {
    try{
        service.registerService(req.body,function(err, result){
            if(err){
                logger.info(
                    err,
                    {
                      "path":req.originalUrl,
                      "function": "sapien register"
                    }
                  );
                  return res.status(400).json({
                    "error": true,
                    "status": 400,
                    "message": err,
                    "data": []
                  });
            }else{
                return res.status(200).json({
                    message: 'User Registered',
                    data:[]
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error registering user',
            data:err
        })
    }
}

exports.login = async(req, res) => {
    try{
        service.loginService(req.body,function(err, result){
            if(err){
                logger.info(
                    err,
                    {
                      "path":req.originalUrl,
                      "function": "sapien login"
                    }
                  );
                  return res.status(400).json({
                    "error": true,
                    "status": 400,
                    "message": err,
                    "data": []
                  });
            }else{
                return res.status(200).json({
                    message: 'User Logged In',
                    data:result
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error logging in',
            data:err
        })
    }
}

exports.forgotPassword = async(req, res) => {
    try{
        service.forgotPasswordService(req.body,function(err, result){
            if(err){
                logger.info(
                    err,
                    {
                      "path":req.originalUrl,
                      "function": "sapien forgot password"
                    }
                  );
                  return res.status(400).json({
                    "error": true,
                    "status": 400,
                    "message": err,
                    "data": []
                  });
            }else{
                return res.status(200).json({
                    message: 'Password reset email sent',
                    data:[]
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error sending password reset email',
            data:err
        })
    }
}

exports.resetPassword = async(req, res) => {
    try{
        service.resetPasswordService(req.body,function(err, result){
            if(err){
                logger.info(
                    err,
                    {
                      "path":req.originalUrl,
                      "function": "sapien password reset"
                    }
                  );
                  return res.status(400).json({
                    "error": true,
                    "status": 400,
                    "message": err,
                    "data": []
                  });
            }else{
                return res.status(200).json({
                    message: 'Password reset',
                    data:[]
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error resetting password',
            data:err
        })
    }
}

exports.getUser = async(req, res) => {
    try{
        service.getUserService(req.params,function(err, result){
            if(err){
                logger.info(
                    err,
                    {
                      "path":req.originalUrl,
                      "function": "sapien getting user"
                    }
                  );
                  return res.status(400).json({
                    "error": true,
                    "status": 400,
                    "message": err,
                    "data": []
                  });
            }else{
                return res.status(200).json({
                    message: 'User Found',
                    data:result.rows
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error getting user',
            data:err
        })
    }
}

exports.updateUser = async(req, res) => {
    try{
        service.updateUserService(req,function(err, result){
            if(err){
                logger.info(
                    err,
                    {
                      "path":req.originalUrl,
                      "function": "sapien update user"
                    }
                  );
                  return res.status(400).json({
                    "error": true,
                    "status": 400,
                    "message": err,
                    "data": []
                  });
            }else{
                return res.status(200).json({
                    message: 'User Updated',
                    data:[]
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error updating user',
            data:err
        })
    }
}

exports.updatePlan = async(req, res) => {
    try{
        service.updatePlanService(req,function(err, result){
            if(err){
                logger.info(
                    err,
                    {
                      "path":req.originalUrl,
                      "function": "sapien update user plan"
                    }
                  );
                  return res.status(400).json({
                    "error": true,
                    "status": 400,
                    "message": err,
                    "data": []
                  });
            }else{
                return res.status(200).json({
                    message: 'Plan Updated',
                    data:[]
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error updating plan',
            data:err
        })
    }
}

exports.checkUserAppName = async(req,res) =>{
    try{
        service.checkUserAppNameService(req,function(err, result){
            if(err){
                logger.info(
                    err,
                    {
                      "path":req.originalUrl,
                      "function": "sapien checking user app name"
                    }
                  );
                  return res.status(400).json({
                    "error": true,
                    "status": 400,
                    "message": err,
                    "data": []
                  });
            }else{
                return res.status(200).json({
                    message: 'App Name Checked',
                    data:result.rows
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error checking app name',
            data:err
        })
    }
}
exports.createUserApp = async(req, res) => {
    try{
        service.createUserAppService(req,function(err, result){
            if(err){
                logger.info(
                    err,
                    {
                      "path":req.originalUrl,
                      "function": "sapien creating user app"
                    }
                  );
                  return res.status(400).json({
                    "error": true,
                    "status": 400,
                    "message": err,
                    "data": []
                  });
            }else{
                return res.status(200).json({
                    message: 'App Created',
                    data:[]
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error creating app',
            data:err
        })
    }
}

exports.getUserApps = async(req, res) => {
    try{
        service.getUserAppService(req,function(err, result){
            if(err){
                return res.status(400).json({
                    message: 'Error getting app',
                    data: err
                })
            }else{
                return res.status(200).json({
                    message: 'Apps Found',
                    data:result.rows
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error getting app',
            data:err
        })
    }
}

exports.getApp = async(req, res) => {
    try{
        service.getAppService(req,function(err, result){
            if(err){
                return res.status(400).json({
                    message: 'Error getting app',
                    data: err
                })
            }else{
                return res.status(200).json({
                    message: 'App Found',
                    data:result.rows
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error getting app',
            data:err
        })
    }
}

exports.getAppByName = async(req, res) => {
    try{
        service.getAppByNameService(req,function(err, result){
            if(err){
                return res.status(400).json({
                    message: 'Error getting app',
                    data: err
                })
            }else{
                return res.status(200).json({
                    message: 'App Found',
                    data:result.rows
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error getting app',
            data:err
        })
    }
}

exports.updateApp = async(req, res) => {
    try{
        service.updateAppService(req,function(err, result){
            if(err){
                logger.info(
                    err,
                    {
                      "path":req.originalUrl,
                      "function": "sapien updaing app"
                    }
                  );
                  return res.status(400).json({
                    "error": true,
                    "status": 400,
                    "message": err,
                    "data": []
                  });
            }else{
                return res.status(200).json({
                    message: 'App Updated',
                    data:[]
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error updating app',
            data:err
        })
    }
}

exports.deleteApp = async(req, res) => {
    try{
        service.deleteAppService(req,function(err, result){
            console.log(err)
            if(err){
                return res.status(400).json({
                    message: 'Error deleting app',
                    data: err
                })
            }else{
                return res.status(200).json({
                    message: 'App Deleted',
                    data:[]
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error deleting app',
            data:err
        })
    }
}

exports.appAuditLog = async(req,res) =>{
    try{
        service.appAuditLogService(req,function(err,result){
            if(err){
                return res.status(400).json({
                    message: 'Error getting app audit log',
                    data: err
                })
            }else{
                return res.status(200).json({
                    message: 'App Audit Log Found',
                    data:result
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error getting app audit log',
            data:err
        })
    }
}

exports.userAuditLog = async(req,res) =>{
    try{
        service.userAuditLogService(req,function(err,result){
            if(err){
                return res.status(400).json({
                    message: 'Error getting app audit log',
                    data: err
                })
            }else{
                return res.status(200).json({
                    message: 'App Audit Log Found',
                    data:result.rows
                })
            }
        })
    } catch (err) {
        return res.status(400).json({
            message: 'Error getting app audit log',
            data:err
        })
    }
}

exports.feedback = async(req,res) => {
    try{
        service.feedbackService(req,function(err,result){
            if(err){
                return res.status(400).json({
                    message: 'Error getting feedback',
                    data: err
                })
            }else{
                return res.status(200).json({
                    message: 'Feedback Found',
                    data:[]
                })
            }
        })
    }
    catch(err){
        return res.status(400).json({
            message: 'Error getting feedback',
            data:err
        })
    }
}