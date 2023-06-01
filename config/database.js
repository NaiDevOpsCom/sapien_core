//Initiate Database Pool
const Pool = require('pg').Pool

const pool = new Pool({
  user: 'postgres',
  database: 'entrada_db',
  password: 'Twende@1357',
  port: 5432,
  host: '127.0.0.1',
})

// pool.connect((err, client) => {
//     if (err) {
//       console.log(`Can not connect to postgres. ${err.stack}`);
//     } else {
//       console.log(`Postgres connected to host: local`);
//       client.query('SELECT * FROM users WHERE email = $1', ["collins"], (err, result) => {
//         console.log(err)
//         // console.log(result)
//         // if (err) {
//         //     callback(err, null)
//         // } else {
//         //     callback(null, result)
//         // }
//     })
//       client.release();
//     }
// });

module.exports = {
    pool:pool
}
