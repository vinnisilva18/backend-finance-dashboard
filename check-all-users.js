const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_dashboard';

async function checkAllUsers() {
  try {
    console.log('🔌 Conectando ao MongoDB...\n');
    await mongoose.connect(MONGODB_URI);

    // Definir schemas
    const userSchema = new mongoose.Schema({
      name: String,
      email: String
    });

    const transactionSchema = new mongoose.Schema({
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      amount: Number,
      description: String,
      type: String,
      date: Date
    });

    const User = mongoose.model('User', userSchema);
    const Transaction = mongoose.model('Transaction', transactionSchema);

    // Buscar todos os usuários
    const users = await User.find({}).sort({ createdAt: -1 });

    console.log(`📋 Analisando ${users.length} usuários...\n`);

    for (const user of users) {
      console.log(`👤 ${user.name} (${user.email})`);
      console.log(`   ID: ${user._id}`);

      // Contar transações
      const totalTransactions = await Transaction.countDocuments({ user: user._id });
      console.log(`   📊 Total de transações: ${totalTransactions}`);

      if (totalTransactions > 0) {
        // Calcular estatísticas
        const transactions = await Transaction.find({ user: user._id });
        
        let totalIncome = 0;
        let totalExpenses = 0;
        
        transactions.forEach(tx => {
          if (tx.type === 'income') {
            totalIncome += tx.amount;
          } else if (tx.type === 'expense') {
            totalExpenses += Math.abs(tx.amount);
          }
        });

        console.log(`   💰 Receitas: R$ ${totalIncome.toFixed(2)}`);
        console.log(`   💸 Despesas: R$ ${totalExpenses.toFixed(2)}`);
        console.log(`   🏦 Saldo: R$ ${(totalIncome - totalExpenses).toFixed(2)}`);

        // Mostrar últimas 3 transações
        const recentTx = transactions.slice(0, 3);
        if (recentTx.length > 0) {
          console.log(`   📝 Últimas transações:`);
          recentTx.forEach(tx => {
            console.log(`      - ${tx.description}: R$ ${tx.amount} (${tx.type})`);
          });
        }
      } else {
        console.log(`   ⚠️  Nenhuma transação encontrada`);
      }

      console.log('');
    }

    await mongoose.connection.close();
    console.log('✅ Análise concluída!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkAllUsers();
