// Main router
const axios = require('axios');
var xml2js = require('xml2js');
const basicAuth = require('express-basic-auth')
const jwt = require('jsonwebtoken');
const Pool = require('pg').Pool
const { v4: uuidv4 } = require('uuid');

const requestIp = require('request-ip');

const { logger } = require('../config/logger');

const pool = new Pool({
    user: 'devuser',
    database: 'entrada_db',
    password: 'devuser',
    port: 5432,
    host: '127.0.0.1',
})

//App Audit Log capturer function
async function appauditLog(req) {
    try {
        let guid = uuidv4();
        let app = req.app;
        let request_url = req.request_url;
        let request_query = req.request_query;
        let request_method = req.request_method;
        let request_status_code = req.request_status_code;
        let request_ip = req.request_ip;
        let request_time_taken = req.request_time_taken + "ms";
        let created_at = new Date();


        let results = await pool.query('INSERT INTO app_activity_audit_log (guid,app,request_url,request_query,request_method,request_status_code,\
            request_ip,request_time_taken,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
            guid, app, request_url, request_query, request_method, request_status_code, request_ip, request_time_taken, created_at
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

// promise function to get the user app requested config.
function getAppConfigs(appName) {
    return new Promise((resolve, reject) => {
        pool.query('SELECT guid, service_definations,ignore_routes,restricted_ips,consumer_key,consumer_secret,jwt_secret,api_key, data_incoming_protocol, data_outgoing_protocol, app_authentication,is_active FROM user_apps WHERE app_name = $1', [appName], (error, results) => {
            if (error) {

                reject(error)
            }
            resolve(results.rows[0])
        })
    })

}

// function to check request authentication to the user app
function authenticateRequest(req, appConfig) {
    // Initialize the authentication status to default false
    var isAuthenticated = false

    // define authentication variables
    let auth = appConfig.app_authentication // check the authenticatin method

    let consumerKey = appConfig.consumer_key // get the consumer key(if any)(if using basic authentication)
    let consumerSecret = appConfig.consumer_secret // get the consumer secret(if any)(if using basic authentication)
    let jwtSecret = appConfig.jwt_secret // get the jwt secret(if any)(if using JWT authentication)
    let apiKey = appConfig.api_key // get the api key(if any)(if using API key authentication)

    // Authentication Logic
    if (auth == 'None') { //If none set is authenticated to true
        isAuthenticated = true
    } else if (auth == 'Basic') { //If basic authentication, check the request headers for the basic authentication and verify
        let header = req.header('authorization', false)
        if (header) {
            let token = header.split(/\s+/).pop() || '';
            if (token.length > 0) {
                let auth1 = new Buffer.from(token, 'base64').toString(),
                    parts = auth1.split(/:/);

                if (parts[0] == consumerKey && parts[1] == consumerSecret) {
                    isAuthenticated = true
                } else {
                    isAuthenticated = false
                }
            } else {
                isAuthenticated = false
            }
        } else {
            isAuthenticated = false
        }

    } else if (auth == 'JWT') {  // If JWT authentication, check the request headers for the JWT token and verify
        // signing secret
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if (token == null) {
            isAuthenticated = false
        }
        jwt.verify(token, jwtSecret, (err, user) => {
            if (err) {
                isAuthenticated = false
            } else {
                isAuthenticated = true
            }
        }
        )

    } else if (auth == 'ApiKey') { // If API key authentication, check the request headers for the API key and verify
        const authHeader = req.headers['authorization']
        const apikey = authHeader && authHeader.split(' ')[1]

        if (apikey == null) {
            isAuthenticated = false
        }
        if (apikey === apiKey) {
            isAuthenticated = true
        } else {
            isAuthenticated = false
        }

    } else if (auth == 'Custom') {
        isAuthenticated = true
    }

    return isAuthenticated
}

// function to convert incooming body
function convertIncomingBody(req, res, appConfig) {
    //initialize body variable
    var body;
    if (req.rawBody) { // check if req contains XML value
        if (appConfig.data_incoming_protocol == 'xml') { // check if the user app is expecting XML
            res.header("Content-Type", "application/xml"); //set xml header
            body = req.rawBody
        } else if (appConfig.data_incoming_protocol == 'json') { //check if the user app is expecting json
            //convert request xml to json so as to send to the user app
            xml2js.parseString(req.rawBody, {
                explicitArray: false,
                ignoreAttrs: true,
                trim: true,
                explicitRoot: false,
                mergeAttrs: true,
                normalize: true,
                normalizeTags: true,
                attrkey: 'attr',
                charkey: 'value',
                tagNameProcessors: [function (name) {
                    return name.replace(/:/g, '_');
                }
                ],
                attrNameProcessors: [function (name) {
                    return name.replace(/:/g, '_');
                }],
            }, function (err, result) {
                body = result
            });
        }
    } else if (req.body) { // check if req contains json
        if (appConfig.data_incoming_protocol == 'XML') { // check if the user app is expecting xml
            // convert jsn to xml
            var builder = new xml2js.Builder();
            var xml = builder.buildObject(req.body);
            res.header("Content-Type", "application/xml"); // set xml header
            body = xml
        } else if (appConfig.data_incoming_protocol == 'json') { // check if the user app is expecting json
            body = req.body // just send the json
        }
    }

    return body // return final body

}

// function to convert outgoing body
function convertOutgoingBody(resp_body, res, appConfig) {
    //initialize body variable
    var body;

    if (typeof (resp_body) == 'string') { // check if response body is xml string
        if (appConfig.data_outgoing_protocol == 'XML') { // check if user response is expecting xml
            res.header("Content-Type", "application/xml"); // set xml header
            body = resp_body
        } else if (appConfig.data_outgoing_protocol == 'json') { // check if user response is expecting json
            // convert to json
            xml2js.parseString(resp_body, {
                explicitArray: false,
                ignoreAttrs: true,
                trim: true,
                explicitRoot: false,
                mergeAttrs: true,
                normalize: true,
                normalizeTags: true,
                attrkey: 'attr',
                charkey: 'value',
                tagNameProcessors: [function (name) {
                    return name.replace(/:/g, '_');
                }
                ],
                attrNameProcessors: [function (name) {
                    return name.replace(/:/g, '_');
                }],
            }, function (err, result) {
                body = result
            });
        }
    } else {
        if (appConfig.data_outgoing_protocol == 'xml') { // check if the user response is expecting xml
            // convert the json object to xml and set header
            var builder = new xml2js.Builder();
            var xml = builder.buildObject(resp_body);
            res.header("Content-Type", "application/xml"); // set xml header
            body = xml
        } else if (appConfig.data_outgoing_protocol == 'json') { // check if the user response is expecting json
            body = resp_body // return as is
        }
    }
    return body /// retunr final body
}

// main controller of requests
exports.gatewayController = async (req, res) => {
    try {
        //get app name from subdomain
        let appName = req.headers['x-subdomain']
        //get app configs
        let appConfig = await getAppConfigs(appName)

        // get restricted ips
        let restrictedIPs = appConfig.restricted_ips


        // check if the request is coming from a positive restricted ip
        let requester_ip = requestIp.getClientIp(req)


        if (restrictedIPs.length == 0 || restrictedIPs.includes(requester_ip)) {

            let ignoreRoutes = appConfig.ignore_routes // get the ignore routes


            //loop through to get the app config details ( especially the service definations)
            if (appConfig.service_definations.length > 0) {
                for (let i = 0; i < appConfig.service_definations.length; i++) {

                    // parse the service definations to get the service name and url
                    const element = JSON.parse(appConfig.service_definations[i]);

                    if (element.name == req.params.serviceName) {
                        // if the service name requested is found in the service definations, then 

                        //check if authentication is required
                        if (ignoreRoutes.length == 0 || ignoreRoutes.includes(req.originalUrl)) { // if the request is to any free pass route, set is authenticated to true
                            var isAuthorized = true
                        } else {
                            const authHeader = req.headers['authorization']
                            const customAuth = authHeader && authHeader.split(' ')[1]
                            if (customAuth == null) {
                                var isAuthorized = authenticateRequest(req, appConfig)
                            } else {
                                var custom_headers = {
                                    "Authorization": 'Bearer ' + customAuth
                                }
                                var isAuthorized = true
                            }

                        }


                        if (isAuthorized === true) {

                            // check if the request path from user has query parameters
                            if (req.originalUrl.includes("?")) {
                                var query = "?" + req.originalUrl.split("?")[1];
                            } else {
                                var query = '';
                            }

                            //compose the final url using the saved service url, saved service name , request path and request query
                            var url = element.url + "/" + req.params.path + query;


                            //convert the incoming body to the required format
                            var initial_body = convertIncomingBody(req, res, appConfig)

                            //record time when the request is sent
                            var request_start = Date.now()

                            // forward the request to it's destination
                            try {
                                var result = await axios({
                                    method: req.method,
                                    headers: custom_headers,
                                    url: url,
                                    data: initial_body
                                })


                            } catch (error) {

                                if (error.response == undefined) {
                                    logger.info(
                                        "Server is down",
                                        {
                                            "path": req.originalUrl,
                                            "function": "Gateway controller"
                                        }
                                    );
                                    var result = {
                                        "error": true,
                                        "status": 401,
                                        "message": "Server is down",
                                        "data": {
                                            error: true,
                                            status: 500,
                                            message: "Server is down",
                                            data: []
                                        }
                                    }

                                } else if (error.response.status >= 500) {

                                    logger.info(
                                        "Server is down",
                                        {
                                            "path": req.originalUrl,
                                            "function": "Gateway controller"
                                        }
                                    );

                                    var result = {
                                        "error": true,
                                        "status": 401,
                                        "message": "Server is down",
                                        "data": {
                                            error: true,
                                            status: 500,
                                            message: "Server is down",
                                            data: []
                                        }
                                    }
                                } else if (error.response.status == 401) {
                                    logger.info(
                                        "Unauthorized",
                                        {
                                            "path": req.originalUrl,
                                            "function": "Gateway controller"
                                        }
                                    );

                                    var result = {
                                        "error": true,
                                        "status": 401,
                                        "message": "Unauthorized",
                                        "data": {
                                            error: true,
                                            status: 401,
                                            message: "Unauthorized",
                                            data: []
                                        }
                                    }
                                } else if (error.response.status == 400) {
                                    logger.info(
                                        "bad request",
                                        {
                                            "path": req.originalUrl,
                                            "function": "Gateway controller"
                                        }
                                    );

                                    var result = {
                                        "error": true,
                                        "status": 400,
                                        "message": "bad request",
                                        "data": {
                                            error: true,
                                            status: 400,
                                            message: "bad request",
                                            data: []
                                        }
                                    }
                                } else {
                                    var result = error.response
                                }



                            }



                            //convert the outgoing body to the required format
                            var final_body = convertOutgoingBody(result.data, res, appConfig)

                            //record time when the response is received
                            var request_end = Date.now() - request_start

                            //app log

                            appauditLog({
                                app: appConfig.guid,
                                request_url: req.url,
                                request_query: req.query,
                                request_method: req.method,
                                request_status_code: res.statusCode,
                                request_ip: requester_ip,
                                request_time_taken: request_end
                            })

                            //send the response to the user


                            return res.status(result.data.status).send(final_body)
                        } else {
                            appauditLog({
                                app: appConfig.guid,
                                request_url: req.url,
                                request_query: req.query,
                                request_method: req.method,
                                request_status_code: 401,
                                request_ip: requester_ip,
                                request_time_taken: request_end
                            })
                            // res.status(401).send('Unauthorized')
                            logger.info(
                                err.message,
                                {
                                    "path": req.originalUrl,
                                    "function": "Gateway controller"
                                }
                            );
                            return res.status(401).json({
                                "error": true,
                                "status": 401,
                                "message": "Unauthorized",
                                "data": []
                            });
                        }
                    }
                }
            } else {

                // res.status(404).send('Service not found')
                logger.info(
                    err.message,
                    {
                        "path": req.originalUrl,
                        "function": "Gateway controller",
                    }
                );
                return res.status(404).json({
                    "error": true,
                    "status": 404,
                    "message": "Service not found",
                    "data": []
                });
            }


        } else {
            // res.status(403).send('Forbidden')
            logger.info(
                err.message,
                {
                    "path": req.originalUrl,
                    "function": "Gateway controller"
                }
            );
            return res.status(403).json({
                "error": true,
                "status": 403,
                "message": "Forbidden",
                "data": []
            });
        }


    } catch (err) {
        logger.info(
            err.message,
            {
                "path": req.originalUrl,
                "function": "Gateway controller "
            }
        );
        return res.status(400).json({
            "error": true,
            "status": 400,
            "message": err.message,
            "data": []
        });
    }
}