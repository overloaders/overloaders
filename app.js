const { Client, ChatTypes } = require('whatsapp-web.js');
const express = require('express');
const Date = require('date-and-time');

const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');

const qrcode = require('qrcode');
const http= require('http');
const fs = require('fs');

const { phoneNumberFormatter } = require('./helpers/formatter');

const { Socket } = require('dgram');
const { response } = require('express');

const app = express();
const server= http.createServer(app);
const io = socketIO(server);


app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname});
});

const client = new Client({ 
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
          ] 
    }, 
    session: sessionCfg 
});



const sql = require('mssql');
const { O_SYNC } = require('constants');
const config = {
    server: '127.0.0.1',
    authentication: {
        type: 'default',
        options: {
            userName: 'sa', 
            password: 'biofree'
        }
    },
    options: {
        database: 'Messages',
        validateBulkLoadParameters:false,
        encrypt: false,
        useColumnNames: true,
    }}


sql.connect(config).then(() => {
    return sql.query`select top 1 * from Messages..WA_IN order by FID desc`
}).then(result => {
    console.log('Database OK');
}).catch(err => {
    console.log(err);
});

sql.on('error', err => {
    console.log(err);
});




const { MessageAck } = require('whatsapp-web.js');
const { waitForDebugger } = require('inspector');

client.on('ready', async () => {
    
    
    //let jumlah = await client.getUnreadCount();
    let chats = await client.getChats();
    for (let chat of chats){
        if( chat.unreadCount > 0){

             let messages = await chat.fetchMessages({limit: chat.unreadCount});
             for (let inichatnya of messages){
                if(!inichatnya.author){
                    console.log(inichatnya);

                    const keyword2 = inichatnya.body.toLowerCase();
                    const pengirim2 = inichatnya.from.toString().split('@c.us').join('');
                    

                    client.sendSeen(inichatnya.from.toString());
                    new sql.Request()
                    .input("penerima", sql.NVarChar(50), pengirim2)
                    .input("pesan", sql.NVarChar(900), keyword2)
                    .query("insert into Messages..wa_in (tanggal,pengirim,pesan) select getdate(), @penerima, @pesan")
                    .then(function (dbData) {
                    if (dbData == null || dbData.length === 0)
                    return;
                    console.dir(dbData);
                    })
                    .catch(function (error) {
                    console.dir(error);
                    });


                }

             }

             
        }

        
    }
    

   
    
});

client.on('message',  msg => {
    const keyword = msg.body.toLowerCase();
    const pengirim = msg.from.toString().split('@c.us').join('');
    

    client.sendSeen(msg.from.toString());
    

    console.log (keyword, ' - x -' , pengirim, ' - ', msg.ack);

    if(!msg.author){
        if(pengirim =='status@broadcast'){
        
        }else{
            
            // To retrieve specific data - Start
            
            new sql.Request()
            .input("penerima", sql.NVarChar(50), pengirim)
            .input("pesan", sql.NVarChar(900), keyword)
            .query("insert into Messages..wa_in (tanggal,pengirim,pesan) select getdate(), @penerima, @pesan")
            .then(function (dbData) {
            if (dbData == null || dbData.length === 0)
            return;
            console.dir('Sukses Menyimpan');
            })
            .catch(function (error) {
            console.dir(error);
            });
            // To retrieve specific data - End
    
            
            console.log (msg);
            
    
        }
    }

    
    


});


function intervalFunc() {
    
    var request = new sql.Request();
    request.query('SELECT top 1 *  FROM Messages..WA_out where fstatus = 0 order by fid desc', function (err, result)
    {
        if (err) console.log(err);
        else {
            row = JSON.stringify(result.rowsAffected).split('[').join('').split(']').join('');
            
            
            if(row !== '0'){
                obj = JSON.parse(JSON.stringify(result.recordset).split('[').join('').split(']').join(''));
                var mID = obj.fID;
                var noTujuan = phoneNumberFormatter(obj.penerima);
                var mPesan = obj.pesan;

                //const number = phoneNumberFormatter(obj.pengirim);
                //noTujuan = '42332432'+ noTujuan;
                client.isRegisteredUser(noTujuan).then(function(isRegistered) {
                    if(isRegistered) {
                            client.sendMessage(noTujuan, mPesan)

                            console.log('Nomor : ' , noTujuan ,'Terdaftar');
                            new sql.Request()
                            .input("fid", sql.BigInt, mID)
                            .input("fstatus", sql.Bit, 1)
                            .query("update Messages..wa_out set logs='Terkirim', fstatus= @fstatus where fid= @fid")
                            .then(function (dbData) {
                                if (dbData == null || dbData.length === 0)
                                return;
                                console.dir(dbData);
                            })
                            .catch(function (error) {
                            console.dir(error);
                            });

                    }else{
                        console.log('Nomor : ' , noTujuan ,'Tidak Terdaftar');

                        new sql.Request()
                        .input("fid", sql.BigInt, mID)
                        .input("fstatus", sql.Bit, 1)
                        .query("update Messages..wa_out set logs='Nomor Tidak Terdaftar di WhatsApp', fstatus= @fstatus where fid= @fid")
                        .then(function (dbData) {
                            if (dbData == null || dbData.length === 0)
                            return;
                            console.dir(dbData);
                        })
                        .catch(function (error) {
                        console.dir(error);
                        });

                    }
                })

                var mPesan = obj.pesan;
                console.log(mID, '#', noTujuan,'#',mPesan);
            }else{
                console.log('Cek Database Pesan Keluar : ', row, 'Pesan..');
            }
            
            
        }
    });

 }

 setInterval(intervalFunc, 10000);


client.initialize();

io.on('connection', function(socket){
    socket.emit('message', 'Connecting...');

    client.on('qr', (qr) => {
        // Generate and scan this code with phone
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) =>{
            socket.emit('qr', url);
            socket.emit('message', 'QrCode Generated...');
        });
    });

    client.on('ready', () => {
        socket.emit('ready', 'Whatsapp is ready..');
        socket.emit('message', 'Whatsapp is ready..');
    });

    client.on('authenticated', (session) => {

        socket.emit('authenticated', 'Whatsapp is Authenticated.');
        socket.emit('message', 'Whatsapp is Authenticated..');

        console.log('AUTHENTICATED', session);
        sessionCfg=session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });

});


const checkRegisteredNumber = async function(number){
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
}
app.post('/send-message',[
    body('number').notEmpty(),
    body('message').notEmpty()

], async (req, res) => {
    const errors = validationResult(req).formatWith(({ msg }) => {
        return msg;
    });

    if(!errors.isEmpty()){
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await checkRegisteredNumber(number); 

    if(!isRegisteredNumber){
        return res.status(422).json({
            status: false,
            message: 'Nomor Belum terdaftar di Whatsapp..'
        });
    }
    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status: true,
            response: response
            
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });

    });

});

/*

server.listen(8000, function()
{
    console.log ('App run on *: ' + 8000);
}
);

*/