import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('grep -rn "proxy_read_timeout" /etc/nginx/ || grep -rn "wms.gepoder.click" /etc/nginx/', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '162.4.176.249',
  port: 24700,
  username: 'root',
  password: '8QRkN417-)++$JTT>$h@'
});
