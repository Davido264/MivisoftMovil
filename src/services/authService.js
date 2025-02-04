import odoo from './odoo_service';

const authenticateUser = async (odooInstance, username, password) => {
  return new Promise((resolve, reject) => {
    // Conectar a Odoo
    odooInstance.connect((err) => {
      if (err) {
        console.error('Error al conectar con Odoo en el login:', err.message);
        return reject({ success: false, message: 'Error al conectar con el servidor.' });
      }

      // Buscar el usuario en la tabla usuarios.trabajo
      odooInstance.search_read(
        'usuarios.trabajo',
        {
          domain: [['username', '=', username], ['password', '=', password]],
          fields: ['id', 'nombre', 'apellido'],
        },
        (error, result) => {
          if (error) {
            console.error('Error al autenticar al usuario:', error.message);
            return reject({ success: false, message: 'Error al buscar el usuario.' });
          }

          if (result.length > 0) {
            // Usuario encontrado
            const user = result[0];
            resolve({
              success: true,
              message: 'Inicio de sesión exitoso.',
              user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
              },
            });
          } else {
            // Credenciales incorrectas
            resolve({ success: false, message: 'Credenciales incorrectas.' });
          }
        }
      );
    });
  });
};

export default {
  authenticateUser,
};