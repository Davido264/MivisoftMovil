import  Odoo from 'react-native-odoo'

const odoo = new Odoo({
    host:'192.168.100.47',
    port:8069,
    database:'odoo',
    username:'admin',
    password:'admin'
});

export default odoo;