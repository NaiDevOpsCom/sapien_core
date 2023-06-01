// const rateLimit = require('express-rate-limit')
// // let rateLimiter  = rateLimit({
// //         windowMs: ms, // 15 minutes
// //         max: max, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
// //         standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
// //         legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// //         message: 'Too many requests, please try again later.'
// //     })


// function checklimit(){
//     console.log("called")
//     rateLimit({
//         windowMs: 1000, // 15 minutes
//         max: 2, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
//         standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//         legacyHeaders: false, // Disable the `X-RateLimit-*` headers
//         message: 'Too many requests, please try again later.'
//     })
// }
// // module.exports = limiter

// module.exports = {
//     checklimit:checklimit
// }