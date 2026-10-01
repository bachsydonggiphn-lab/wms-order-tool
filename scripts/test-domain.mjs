import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -sI -k https://wms.gepoder.click/ && curl -sI http://wms.gepoder.click/', (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => console.log(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '162.4.176.249',
  port: 24700,
  username: 'root',
  password: '8QRkN417-)++$JTT>$h@',
  readyTimeout: 15000,
});
