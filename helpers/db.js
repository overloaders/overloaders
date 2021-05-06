const mysql = require('mssql');
const { create } = require('qrcode');
const createConnection = async() => {
    return await mysql.createConnection({
        user: 'sa',
        password: 'biofree',
        server: '127.0.0.1',
        database: 'Messages',
    });

}


const sql = require('mssql');

const config = {
    user: 'sa',
        password: 'biofree',
        server: '127.0.0.1',
        database: 'Messages',
}




const ambilBalasan = async (keyword) => {
    const connection = await createConnection();
    const [rows] = await connection.execute('Select message from wa_replies where keyword = ?', [keyword]);
    if(rows.lenght>0) return rows[0].message;
    return false;


    mysql.connect(config, function (err) {
    
        if (err) console.log(err);

        // create Request object
        const request = new mysql.Request();
           
        // query to the database and get the records
        request.query("Select message from wa_replies where keyword = '[keyword]'", function (err, recordset) {
            
            if (err) console.log(err)

            // send records as a response
            res.send(recordset);
            
        });
    });


}



const getReply = async (keyword) => {
    const connection = await createConnection();
    const [rows] = await connection.execute('Select message from wa_replies where keyword = ?', [keyword]);
    if(rows.lenght>0) return rows[0].message;
    return false;



}

module.exports ={
    createConnection
    
}