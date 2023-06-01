const Pool = require('pg').Pool
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { generateApiKey } = require('generate-api-key');
const sendEmail = require('../utils/sendEmail');

const pool = new Pool({
    user: 'devuser',
    database: 'entrada_db',
    password: 'devuser',
    port: 5432,
    host: '127.0.0.1',
})

function email_validator(email) {
    let emailRex = /^([\w-\.]+@(([\w-]+\.)+[\w-]{2,4}))?$/;
    var bad_domains = ['mozej.', 'mailinator.', 'mailna.', 'mohmal.', 'boxomail.', 'migonom.', 'kellychibale-researchgroup-uct.', 'mailo.', 'ema-sofia.', 'hungeral.'
        , 'vusra.', 'aladeen.', 'ilydeen.', 'rocketestate724.',];
    let emailMatch = email.match(emailRex)
    domain = emailMatch[3];
    let result = true
    for (var i = 0; i < bad_domains.length; i += 1) {
        if (domain.toLowerCase() == bad_domains[i]) {
            result = false;
        }
    }

    return result
}

function app_name_validator(app_name) {
    let app_nameMatch_dash = app_name.match(/^[a-z]+-[a-z]+/)
    let app_nameMatch_uppercase = app_name.match(/^[a-z]+$/)

    if (app_nameMatch_dash != null) {
        if (app_nameMatch_uppercase != null) {
            return true;
        }

        return true;
    } else if (app_nameMatch_uppercase != null) {
        if (app_nameMatch_dash != null) {
            return true;
        }
        return true;
    } else {
        return false;
    }
}

//Audit Log capturer function
async function auditLog(req) {
    try {
        let guid = uuidv4();
        let user = req.user;
        let activity = req.activity;
        let created_at = new Date();
        let created_by = req.user;
        let updated_at = new Date();
        let updated_by = req.user;

        let results = await pool.query('INSERT INTO user_activity_audit_log (guid,"user",activity,created_at,\
            created_by,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [
            guid, user, activity, created_at, created_by, updated_at, updated_by
        ]);
        if (results) {
            return true;
            // callback(null, "Audit log captured successfully")
        } else {
            return true;
            // callback(new Error("Audit log capturing failed").message, null)
        }
    } catch (e) {
        return true;
        // callback(new Error(e).message, null)
    }
}

exports.registerService = async (body, callback) => {
    try {
        if (email_validator(body.email)) {
            body.guid = uuidv4();
            body.is_active = true;
            body.email = body.email.toLowerCase();
            let created_at = new Date();
            let updated_at = new Date();
            let package_plan = 'hobby'; //default package plan
            let total_apps = 0;
            body.password = await bcrypt.hash(body.password, saltRounds);

            let results = await pool.query('INSERT INTO users (guid,email, password, first_name, last_name, company,speciality, primary_dev_language, country, created_by,is_active,package_plan,total_apps,created_at,updated_at)\
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10,$11,$12,$13,$14,$15)', [body.guid, body.email, body.password, body.first_name, body.last_name, body.company, body.speciality, body.primary_dev_language, body.country, body.created_by, body.is_active, package_plan, total_apps, created_at, updated_at]);

            console.log(results)
            auditLog({
                user: body.guid,
                activity: "You registration date"
            })
            header = "Welcome to Sapien Africa"
            message = "Your Sapien Account has been created successfully, kindly click below to login"
            token = "https://app.sapienafrica.com/login.html"
            sendEmail(body.email, header, body.first_name, message, '', token);

            callback(null, results)
        } else {
            callback(new Error("Invalid Email Address").message, null)
        }
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.loginService = async (body, callback) => {
    try {
        let results = await pool.query('SELECT * FROM users WHERE email = $1', [body.email]);
        if (results.rows.length > 0) {
            bcrypt.compare(body.password, results.rows[0].password, function (err, res) {
                if (res) {
                    const token = jwt.sign({ email: results.rows[0].email, guid: results.rows[0].guid }, 'secretkey');
                    let success_data = {
                        "token": token,
                        "user": results.rows[0]
                    }
                    callback(null, success_data)

                    auditLog({
                        user: results.rows[0].guid,
                        activity: "Login Successful"
                    })
                } else {
                    auditLog({
                        user: results.rows[0].guid,
                        activity: "Failed Login attempt"
                    })
                    callback(new Error("Invalid Email/Password").message, null)
                }
            });
        } else {
            callback(new Error("User not found").message, null)
        }
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.forgotPasswordService = async (body, callback) => {
    try {
        let created_at = new Date();
        let updated_at = new Date();
        let results = await pool.query('SELECT * FROM users WHERE email = $1', [body.email]);
        if (results.rows.length > 0) {
            let token = Math.floor(1000 + Math.random() * 9000);
            let checkExisting = await pool.query('SELECT * FROM reset_password WHERE "user" = $1', [results.rows[0].guid]);
            if (checkExisting.rows.length > 0) {
                let updateExisting = await pool.query('UPDATE reset_password SET token = $1, created_at = $2, updated_at = $3 WHERE "user" = $4', [token, created_at, updated_at, results.rows[0].guid]);
                header = "Sapien Password Reset"
                message = "We have received a password reset request . Kindly find below the reset link. If you didn't request it kindly ignore this email "
                token = "https://app.sapienafrica.com/reset_password.html?token=" + token
                sendEmail(body.email, header, results.rows[0].first_name, message, '', token);
                callback(null, updateExisting)
            } else {
                await pool.query('INSERT INTO reset_password (guid, "user", token, created_at,updated_at) VALUES ($1, $2, $3,$4,$5)', [uuidv4(), results.rows[0].guid, token, created_at, updated_at]);
                header = "Sapien Password Reset"
                message = "Your Sapien Account has requested a password reset, kindly click the link if you have requested the reset"
                token = "https://app.sapienafrica.com/reset_password.html?token=" + token
                sendEmail(body.email, header, results.rows[0].first_name, message, '', token);
                callback(null, "Password reset link sent to your email")
            }
        } else {
            callback(new Error("User not found").message, null)
        }
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.resetPasswordService = async (body, callback) => {
    try {
        let user = await pool.query('SELECT * FROM users WHERE email = $1', [body.email]);
        if (user.rows.length > 0) {

            let token = await pool.query('SELECT * FROM reset_password WHERE "user" = $1 and token= $2', [user.rows[0].guid, body.token]);
            if (token.rows.length > 0) {
                let password = await bcrypt.hash(body.password, saltRounds);
                let updatePassword = await pool.query('UPDATE users SET password = $1 WHERE guid = $2', [password, user.rows[0].guid]);
                if (updatePassword) {
                
                    await pool.query('DELETE FROM reset_password WHERE "user" = $1', [user.rows[0].guid]);
                    auditLog({
                        user: user.rows[0].guid,
                        activity: "You made a change to your password"
                    })

                    header = "Sapien Reset Successful"
                    message = "Your Sapien Account has been reset successfully, kindly click below to login"
                    token = "https://app.sapienafrica.com/login.html"
                    sendEmail(body.email, header, user.rows[0].first_name, message, '', token);
                    callback(null, "Password reset successfully")
                } else {
                    callback(new Error("Password reset failed").message, null)
                }
            } else {
                callback(new Error("Invalid token").message, null)
            }
        } else {
            callback(new Error("User not found").message, null)
        }
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.getUserService = async (params, callback) => {
    try {
        let results = await pool.query('SELECT *,NULL AS password FROM users WHERE email = $1', [params.email]);
        callback(null, results)
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.updateUserService = async (req, callback) => {
    try {
        req.body.updated_at = new Date();
        req.body.updated_by = req.user.guid;

        let results = await pool.query('UPDATE users SET first_name = COALESCE($1,first_name), last_name = COALESCE($2,last_name), company = COALESCE($3,company), \
        speciality = COALESCE($4,speciality), primary_dev_language = COALESCE($5,primary_dev_language), country = COALESCE($6,country),\
         updated_at = $7,updated_by=$8 WHERE guid = $9', [req.body.first_name, req.body.last_name, req.body.company, req.body.speciality, req.body.primary_dev_language, req.body.country, req.body.updated_at, req.body.updated_by, req.user.guid]);
        callback(null, results)
        auditLog({
            user: results.rows[0].guid,
            activity: "You updated your profile"
        })
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.updatePlanService = async (req, callback) => {
    try {
        req.body.updated_at = new Date();
        req.body.updated_by = req.user.guid;

        let results = await pool.query('UPDATE users SET package_plan = COALESCE($1,package_plan), updated_at = $2,updated_by=$3 WHERE guid = $4', [req.body.package_plan, req.body.updated_at, req.body.updated_by, req.user.guid]);
        callback(null, results)
        auditLog({
            user: results.rows[0].guid,
            activity: "You updated your plan to " + req.body.package_plan
        })
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.checkUserAppNameService = async(req,callback) =>{
    try{

        let results = await pool.query('SELECT * FROM user_apps WHERE app_name = $1',[req.body.app_name]);
        if(results.rows.length > 0){
            callback(new Error("App name already exists").message,null)
        }else{
            let res = app_name_validator(req.body.app_name)
            console.log(res)
            if(res == true){
                callback(null,true)
            }else{
                callback(new Error("App name is invalid").message,null)
            }
        }

    }catch(e){
        callback(new Error(e).message,null)
    }
}
exports.createUserAppService = async (req, callback) => {
    try {
        let checkUserPlan = await pool.query('SELECT package_plan,total_apps FROM users WHERE guid = $1', [req.user.guid]);
        if (checkUserPlan.rows.length > 0) {
            let total_apps = checkUserPlan.rows[0].total_apps;
            let package_plan = checkUserPlan.rows[0].package_plan;

            if (package_plan == 'hobby') {
                if (total_apps < 3) {
                    if (app_name_validator(req.body.app_name)) {
                        req.body.created_at = new Date();
                        req.body.updated_at = new Date();
                        req.body.created_by = req.user.guid
                        req.body.users = req.user.guid
                        req.body.guid = uuidv4();
                        req.body.app_url = "https://"+req.body.app_name + ".sapienafrica.com";
                        req.body.data_incoming_protocol = 'json'
                        req.body.data_outgoing_protocol = 'json'
                        req.body.app_authentication = 'None'
                        req.body.rate_per_minute = 2
                        req.body.rate_per_request = 10
                        req.body.service_definations = []
                        req.body.is_active = true;
                        req.body.consumerKey = generateApiKey({ method: 'bytes', prefix: req.body.app_name, min: 18 });
                        req.body.consumerSecret = generateApiKey({ method: 'bytes', min: 15 });
                        req.body.jwtSecret = generateApiKey({ method: 'bytes', min: 15 });
                        req.body.apiKey = generateApiKey({ method: 'bytes', min: 18 });
                        req.body.ignore_routes = []
                        req.body.restricted_ips = []

                        let results = await pool.query('INSERT INTO user_apps (guid, app_name, app_url,service_definations, app_authentication, data_incoming_protocol, data_outgoing_protocol,rate_per_minute,rate_per_request,users, \
                            created_by, is_active,consumer_key,consumer_secret,jwt_secret,api_key,ignore_routes,restricted_ips, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)', [req.body.guid, req.body.app_name, req.body.app_url, req.body.service_definations, req.body.app_authentication,
                        req.body.data_incoming_protocol, req.body.data_outgoing_protocol, req.body.rate_per_minute, req.body.rate_per_request, req.body.users, req.body.created_by, req.body.is_active, req.body.consumerKey, req.body.consumerSecret, req.body.jwtSecret, req.body.apiKey, req.body.ignore_routes, req.body.restricted_ips, req.body.created_at, req.body.updated_at]);

                        if (results) {
                            await pool.query('UPDATE users SET total_apps = $1 WHERE guid = $2', [total_apps + 1, req.user.guid]);
                            auditLog({
                                user: req.user.guid,
                                activity: "Your "+req.body.app_name+" app was created for "+package_plan+" plan"
                            })
                            callback(null, "App created successfully")
                        } else {
                            callback(new Error("App creation failed").message, null)
                        }
                    } else {
                        callback(new Error("Invalid app name").message, null)

                    }
                } else {
                    callback(new Error("You have reached your limit of apps, Upgrade to get Unlimited apps").message, null)
                }
            } else if (package_plan == 'standard') {
                if (total_apps < 8) {
                    if (app_name_validator(req.body.app_name)) {
                        req.body.created_at = new Date();
                        req.body.updated_at = new Date();
                        req.body.created_by = req.user.guid
                        req.body.users = req.user.guid
                        req.body.guid = uuidv4();
                        req.body.app_url = "https://"+req.body.app_name + ".sapienafrica.com";
                        req.body.data_incoming_protocol = 'json';
                        req.body.data_outgoing_protocol = 'json';
                        req.body.app_authentication = req.body.app_authentication == '' || req.body.app_authentication == undefined ? 'None' : req.body.app_authentication;
                        req.body.rate_per_minute = req.body.rate_per_minute == '' || req.body.rate_per_minute == undefined ? 15 : req.body.rate_per_minute;
                        req.body.rate_per_request = req.body.rate_per_request == '' || req.body.rate_per_request == undefined ? 100 : req.body.rate_per_request;
                        req.body.service_definations = []
                        req.body.is_active = true;
                        req.body.consumerKey = generateApiKey({ method: 'bytes', prefix: req.body.app_name, min: 18 });
                        req.body.consumerSecret = generateApiKey({ method: 'bytes', min: 15 });
                        req.body.jwtSecret = generateApiKey({ method: 'bytes', min: 15 });
                        req.body.apiKey = generateApiKey({ method: 'bytes', min: 18 });
                        req.body.ignore_routes = []
                        req.body.restricted_ips = []

                        let results = await pool.query('INSERT INTO user_apps (guid, app_name, app_url,service_definations, app_authentication, data_incoming_protocol, data_outgoing_protocol,rate_per_minute,rate_per_request,users, \
                            created_by, is_active,consumer_key,consumer_secret,jwt_secret,api_key,ignore_routes,restricted_ips, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)', [req.body.guid, req.body.app_name, req.body.app_url, req.body.service_definations, req.body.app_authentication,
                        req.body.data_incoming_protocol, req.body.data_outgoing_protocol, req.body.rate_per_minute, req.body.rate_per_request, req.body.users, req.body.created_by, req.body.is_active, req.body.consumerKey, req.body.consumerSecret, req.body.jwtSecret, req.body.apiKey, req.body.ignore_routes, req.body.restricted_ips, req.body.created_at, req.body.updated_at]);

                        if (results) {
                            await pool.query('UPDATE users SET total_apps = $1 WHERE guid = $2', [total_apps + 1, req.user.guid]);
                            auditLog({
                                user: req.user.guid,
                                activity: "Your "+req.body.app_name+" app was created for "+package_plan+" plan"
                            })
                            callback(null, "App created successfully")
                        } else {
                            callback(new Error("App creation failed").message, null)
                        }
                    } else {
                        callback(new Error("Invalid app name").message, null)

                    }
                } else {
                    callback(new Error("You have reached your limit of apps, Upgrade to get Unlimited apps").message, null)
                }
            } else if (package_plan == 'performance') {
                console.log(req.body)
                if (app_name_validator(req.body.app_name)) {
                    req.body.created_at = new Date();
                    req.body.updated_at = new Date();
                    req.body.created_by = req.user.guid
                    req.body.users = req.user.guid
                    req.body.guid = uuidv4();
                    req.body.app_url = "https://"+req.body.app_name + ".sapienafrica.com";
                    req.body.data_incoming_protocol = req.body.data_incoming_protocol == '' || req.body.data_incoming_protocol == undefined ? 'json' : req.body.data_incoming_protocol;
                    req.body.data_outgoing_protocol = req.body.data_outgoing_protocol == '' || req.body.data_outgoing_protocol == undefined ? 'json' : req.body.data_outgoing_protocol;
                    req.body.app_authentication = req.body.app_authentication == '' || req.body.app_authentication == undefined ? 'None' : req.body.app_authentication;
                    req.body.rate_per_minute = req.body.rate_per_minute == '' || req.body.rate_per_minute == undefined ? 15 : req.body.rate_per_minute;
                    req.body.rate_per_request = req.body.rate_per_request == '' || req.body.rate_per_request == undefined ? 100 : req.body.rate_per_request;
                    req.body.service_definations = []
                    req.body.is_active = true;
                    req.body.consumerKey = generateApiKey({ method: 'bytes', prefix: req.body.app_name, min: 18 });
                    req.body.consumerSecret = generateApiKey({ method: 'bytes', min: 15 });
                    req.body.jwtSecret = generateApiKey({ method: 'bytes', min: 15 });
                    req.body.apiKey = generateApiKey({ method: 'bytes', min: 18 });
                    req.body.ignore_routes = []
                    req.body.restricted_ips = []

                    let results = await pool.query('INSERT INTO user_apps (guid, app_name, app_url,service_definations, app_authentication, data_incoming_protocol, data_outgoing_protocol,rate_per_minute,rate_per_request,users, \
                        created_by, is_active,consumer_key,consumer_secret,jwt_secret,api_key,ignore_routes,restricted_ips, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)', [req.body.guid, req.body.app_name, req.body.app_url, req.body.service_definations, req.body.app_authentication,
                    req.body.data_incoming_protocol, req.body.data_outgoing_protocol, req.body.rate_per_minute, req.body.rate_per_request, req.body.users, req.body.created_by, req.body.is_active, req.body.consumerKey, req.body.consumerSecret, req.body.jwtSecret, req.body.apiKey, req.body.ignore_routes, req.body.restricted_ips, req.body.created_at, req.body.updated_at]);

                    if (results) {
                        await pool.query('UPDATE users SET total_apps = $1 WHERE guid = $2', [total_apps + 1, req.user.guid]);
                        auditLog({
                            user: req.user.guid,
                            activity: "Your "+req.body.app_name+" app was created for "+package_plan+" plan"
                        })
                        callback(null, "App created successfully")
                    } else {
                        callback(new Error("App creation failed").message, null)
                    }
                } else {
                    callback(new Error("Invalid app name").message, null)
                }
            }

        } else {
            callback(new Error("User not found").message, null)
        }
    } catch (e) {
        console.log(e)
        callback(new Error(e).message, null)
    }
}

exports.getUserAppService = async (req, callback) => {
    try {
        let results = await pool.query('SELECT * FROM user_apps WHERE users = $1 ORDER BY app_name asc', [req.user.guid]);
        callback(null, results)
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.getAppService = async (req, callback) => {
    try {
        let results = await pool.query('SELECT * FROM user_apps WHERE guid = $1 and users = $2', [req.params.app_id, req.user.guid]);
        callback(null, results)
    } catch (e) {
        callback(new Error(e).message, null)
    }
}


exports.getAppByNameService = async (req, callback) => {
    try {
        let results = await pool.query('SELECT * FROM user_apps WHERE app_name = $1 and users = $2', [req.params.app_name, req.user.guid]);
        callback(null, results)
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.updateAppService = async (req, callback) => {
    try {
        let checkUserPlan = await pool.query('SELECT package_plan FROM users WHERE guid = $1', [req.user.guid]);
        let updating_app = await pool.query('SELECT * FROM user_apps WHERE guid = $1 and users = $2', [req.params.app_id, req.user.guid]);

        if (req.body.app_name == undefined) {
            req.body.app_name = updating_app.rows[0].app_name
        } else {
            req.body.app_name = req.body.app_name
        }


        if (req.body.service_definations == undefined) {
            req.body.service_definations = updating_app.rows[0].service_definations
        } else {
            req.body.service_definations = req.body.service_definations
        }

        if (req.body.ignore_routes == undefined) {
            req.body.ignore_routes = updating_app.rows[0].ignore_routes
        } else {
            req.body.ignore_routes = req.body.ignore_routes
        }

        if (req.body.restricted_ips == undefined) {
            req.body.restricted_ips = updating_app.rows[0].restricted_ips
        } else {
            req.body.restricted_ips = req.body.restricted_ips
        }


        req.body.updated_at = new Date();
        req.body.updated_by = req.user.guid;

        if (req.body.app_name) {
            if (app_name_validator(req.body.app_name)) {
                req.body.app_url = "https://"+req.body.app_name + ".sapienafrica.com";

                if (checkUserPlan.rows.length > 0) {
                    let package_plan = checkUserPlan.rows[0].package_plan;
                    if (package_plan == 'hobby') {
                        if (req.body.service_definations.length <= 1) {
                            let results = await pool.query('UPDATE user_apps SET app_name = COALESCE($1,app_name), app_url = COALESCE($2,app_url), app_authentication = COALESCE($3,app_authentication), \
                            service_definations = COALESCE($4,service_definations) ,ignore_routes = COALESCE($5,ignore_routes),is_active = COALESCE($6,is_active), updated_at = $7,updated_by =$8 WHERE guid = $9 and \
                             users = $10', [req.body.app_name, req.body.app_url, req.body.app_authentication, req.body.service_definations, req.body.ignore_routes, req.body.is_active, req.body.updated_at, req.body.updated_by, req.params.app_id, req.user.guid]);
                            if (results) {
                                auditLog({
                                    user: req.user.guid,
                                    activity: "Your "+req.body.app_name+" app was updated"
                                })
                                callback(null, "App updated successfully")
                            } else {
                                callback(new Error("App updating failed").message, null)
                            }
                        } else {
                            callback(new Error("You have reached your limit of services, Upgrade to add Unlimited service definations").message, null)
                        }
                    } else if (package_plan == 'standard') {
                        if (req.body.service_definations.length <= 4) {
                            let results = await pool.query('UPDATE user_apps SET app_name = COALESCE($1,app_name), app_url = COALESCE($2,app_url), app_authentication = COALESCE($3,app_authentication), \
                             rate_per_minute = COALESCE($4,rate_per_minute),rate_per_request = COALESCE($5,rate_per_request),service_definations =COALESCE($6,service_definations),ignore_routes = COALESCE($7,ignore_routes),is_active = COALESCE($8,is_active), updated_at = $9,updated_by =$10 WHERE guid = $11 and \
                             users = $12', [req.body.app_name, req.body.app_url, req.body.app_authentication, req.body.rate_per_minute, req.body.rate_per_request, req.body.service_definations, req.body.ignore_routes, req.body.is_active, req.body.updated_at, req.body.updated_by, req.params.app_id, req.user.guid]);
                            if (results) {
                                auditLog({
                                    user: req.user.guid,
                                    activity: "Your "+req.body.app_name+" app was updated"
                                })
                                callback(null, "App updated successfully")
                            } else {
                                callback(new Error("App updating failed").message, null)
                            }
                        } else {
                            callback(new Error("You have reached your limit of services, Upgrade to add Unlimited service definations").message, null)
                        }
                    } else if (package_plan == 'performance') {
                        let results = await pool.query('UPDATE user_apps SET app_name = COALESCE($1,app_name), app_url = COALESCE($2,app_url), app_authentication = COALESCE($3,app_authentication), \
                        data_incoming_protocol = COALESCE($4,data_incoming_protocol), data_outgoing_protocol = COALESCE($5,data_outgoing_protocol),rate_per_minute = COALESCE($6,rate_per_minute),rate_per_request = COALESCE($7,rate_per_request), \
                        service_definations =COALESCE($8,service_definations),ignore_routes = COALESCE($9,ignore_routes),restricted_ips = COALESCE($10,restricted_ips),is_active = COALESCE($11,is_active), updated_at = $12,updated_by =$13 WHERE guid = $14 and \
                         users = $15', [req.body.app_name, req.body.app_url, req.body.app_authentication, req.body.data_incoming_protocol,
                        req.body.data_outgoing_protocol, req.body.rate_per_minute, req.body.rate_per_request, req.body.service_definations, req.body.ignore_routes, req.body.restricted_ips, req.body.is_active, req.body.updated_at, req.body.updated_by, req.params.app_id, req.user.guid]);
                        if (results) {
                            auditLog({
                                user: req.user.guid,
                                activity: "Your "+req.body.app_name+" app was updated"
                            })
                            callback(null, "App updated successfully")
                        } else {
                            callback(new Error("App updating failed").message, null)
                        }
                    }
                } else {
                    callback(new Error("User not found").message, null)
                }
            } else {
                callback(new Error("Invalid app name").message, null)
            }
        } else {
            if (checkUserPlan.rows.length > 0) {
                let package_plan = checkUserPlan.rows[0].package_plan;
                if (package_plan == 'hobby') {
                    if (req.body.service_definations.length <= 1) {
                        let results = await pool.query('UPDATE user_apps SET app_url = COALESCE($1,app_url), app_authentication = COALESCE($2,app_authentication), \
                        service_definations =COALESCE($3,service_definations),ignore_routes = COALESCE($4,ignore_routes),is_active = COALESCE($5,is_active), updated_at = $6,updated_by =$7 WHERE guid = $8 and \
                         users = $9', [req.body.app_url, req.body.app_authentication, req.body.service_definations, req.body.ignore_routes, req.body.is_active, req.body.updated_at, req.body.updated_by, req.params.app_id, req.user.guid]);
                        if (results) {
                            auditLog({
                                user: req.user.guid,
                                activity: "Your "+req.body.app_name+" app was updated"
                            })
                            callback(null, "App updated successfully")
                        } else {
                            callback(new Error("App updating failed").message, null)
                        }
                    } else {
                        callback(new Error("You have reached your limit of services, Upgrade to add Unlimited service definations").message, null)
                    }
                } else if (package_plan == 'standard') {
                    if (req.body.service_definations.length <= 4) {
                        let results = await pool.query('UPDATE user_apps SET app_authentication = COALESCE($1,app_authentication), \
                         rate_per_minute = COALESCE($2,rate_per_minute),rate_per_request = COALESCE($3,rate_per_request),service_definations =COALESCE($4,service_definations),ignore_routes = COALESCE($5,ignore_routes),is_active = COALESCE($6,is_active), updated_at = $7,updated_by =$8 WHERE guid = $9 and \
                         users = $10', [req.body.app_authentication, req.body.rate_per_minute, req.body.rate_per_request, req.body.service_definations, req.body.ignore_routes, req.body.is_active, req.body.updated_at, req.body.updated_by, req.params.app_id, req.user.guid]);
                        if (results) {
                            auditLog({
                                user: req.user.guid,
                                activity: "Your "+req.body.app_name+" app was updated"
                            })
                            callback(null, "App updated successfully")
                        } else {
                            callback(new Error("App updating failed").message, null)
                        }
                    } else {
                        callback(new Error("You have reached your limit of services, Upgrade to add Unlimited service definations").message, null)
                    }
                } else if (package_plan == 'performance') {

                    let results = await pool.query('UPDATE user_apps SET app_authentication = COALESCE($1,app_authentication), \
                    data_incoming_protocol = COALESCE($2,data_incoming_protocol), data_outgoing_protocol = COALESCE($3,data_outgoing_protocol),rate_per_minute = COALESCE($4,rate_per_minute),rate_per_request = COALESCE($5,rate_per_request), \
                    service_definations =COALESCE($6,service_definations),ignore_routes = COALESCE($7,ignore_routes),restricted_ips = COALESCE($8,restricted_ips), is_active = COALESCE($9,is_active), updated_at = $10,updated_by =$11 WHERE guid = $12 and \
                     users = $13', [req.body.app_authentication, req.body.data_incoming_protocol,
                    req.body.data_outgoing_protocol, req.body.rate_per_minute, req.body.rate_per_request, req.body.service_definations, req.body.ignore_routes, req.body.restricted_ips, req.body.is_active, req.body.updated_at, req.body.updated_by, req.params.app_id, req.user.guid]);
                    if (results) {
                        auditLog({
                            user: req.user.guid,
                            activity: "Your "+req.body.app_name+" app was updated"
                        })
                        callback(null, "App updated successfully")
                    } else {
                        callback(new Error("App updating failed").message, null)
                    }
                }
            } else {
                callback(new Error("User not found").message, null)
            }
        }
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.deleteAppService = async (req, callback) => {
    try {
        console.log(req.params.app_id)
        let results1 = await pool.query('SELECT * FROM user_apps WHERE guid = $1 and users = $2', [req.params.app_id, req.user.guid]);
        await pool.query('DELETE FROM user_apps WHERE guid = $1 and users = $2', [req.params.app_id, req.user.guid]);
        if (results1) {
            console.log(results1.rows[0].app_name)
            auditLog({
                user: req.user.guid,
                activity: "Your "+results1.rows[0].app_name+" app was deleted"
            })
            callback(null, "App deleted successfully")
        } else {
            callback(new Error("App deletion failed").message, null)
        }
    } catch (e) {
        callback(new Error(e).message, null)
    }
}

exports.appAuditLogService = async(req,callback) =>{
    try{
        let results = await pool.query("SELECT COUNT(*) cnt,to_timestamp(floor((extract('epoch' from created_at) / 300 )) * 300)  AT TIME ZONE 'EAT' as interval_alias FROM app_activity_audit_log  WHERE app = $1 GROUP BY interval_alias",[req.params.app_id]);
        let results2 = await pool.query("Select count(*) cnt, request_ip FROM app_activity_audit_log  WHERE app = $1 GROUP BY request_ip",[req.params.app_id]);
        if(results){
            let data = {
                fgraph:results.rows,
                sgraph:results2.rows
            }
            callback(null,data)
        }else{
            callback(new Error("No audit logs found").message,null)
        }
    }catch(e){
        callback(new Error(e).message,null)
    }
}

exports.userAuditLogService = async(req,callback) =>{
    try{
        let results = await pool.query('SELECT * FROM user_activity_audit_log WHERE "user" = $1',[req.user.guid]);
        if(results){
            callback(null,results.rows)
        }else{
            callback(new Error("No audit logs found").message,null)
        }
    }catch(e){
        callback(new Error(e).message,null)
    }
}

exports.feedbackService =async(req,callback)=>{
    try{
        req.body.created_at = new Date()
        let results = await pool.query('INSERT INTO feedbacks (guid,"user",feedback_text,rating,created_at) VALUES ($1,$2,$3,$4,$5)',[uuidv4(),req.user.guid,req.body.feedback_text,req.body.rating,req.body.created_at]);
        if(results){
            callback(null,"Feedback sent successfully")
        }else{
            callback(new Error("Feedback sending failed").message,null)
        }
    }catch(e){
        callback(new Error(e).message,null)
    }
}