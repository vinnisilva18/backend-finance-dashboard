const mongoose = require('mongoose');
require('dotenv').config();

// Conectar ao MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_dashboard';

async function listUsers() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!\n');

    // Definir schema do User
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      createdAt: Date
    });

    const User = mongoose.model('User', userSchema);

    // Buscar todos os usuários
    const users = await User.find({}).select('name email createdAt').sort({ createdAt: -1 });

    console.log(`📋 Total de usuários no banco: ${users.length}\n`);

    if (users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado no banco de dados!');
      console.log('   Você precisa criar uma conta no frontend primeiro.\n');
    } else {
      console.log('👥 Lista de usuários:\n');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Criado em: ${user.createdAt}\n`);
      });

      console.log('💡 Use um destes emails no arquivo test-frontend-user.js');
    }

    await mongoose.connection.close();
    console.log('✅ Conexão fechada');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

listUsers();
