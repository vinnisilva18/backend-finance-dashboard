const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_dashboard';

async function testViniciusStats() {
  try {
    console.log('🔌 Conectando ao MongoDB...\n');
    await mongoose.connect(MONGODB_URI);

    // ID do usuário Vinicius
    const userId = new mongoose.Types.ObjectId('696d5261763edfd98a568766');

    console.log('👤 Testando estatísticas para: Vinicius');
    console.log(`   User ID: ${userId}\n`);

    // Definir schema
    const transactionSchema = new mongoose.Schema({
      user: mongoose.Schema.Types.ObjectId,
      amount: Number,
      description: String,
      type: String,
      date: Date
    });

    const Transaction = mongoose.model('Transaction', transactionSchema);

    // 1. Contar transações
    const totalTransactions = await Transaction.countDocuments({ user: userId });
    console.log(`1️⃣ Total de transações: ${totalTransactions}`);

    // 2. Calcular com agregação (como o endpoint faz)
    const transactionStats = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
            }
          },
          totalExpenses: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, 0]
            }
          }
        }
      }
    ]);

    console.log('\n2️⃣ Resultado da agregação:');
    console.log(JSON.stringify(transactionStats, null, 2));

    const totalIncome = transactionStats[0]?.totalIncome || 0;
    const totalExpenses = transactionStats[0]?.totalExpenses || 0;
    const totalSavings = totalIncome - totalExpenses;

    console.log('\n3️⃣ Valores calculados:');
    console.log(`   Receitas: R$ ${totalIncome.toFixed(2)}`);
    console.log(`   Despesas: R$ ${totalExpenses.toFixed(2)}`);
    console.log(`   Economias: R$ ${totalSavings.toFixed(2)}`);

    // 3. Buscar transações para debug
    const transactions = await Transaction.find({ user: userId });
    console.log('\n4️⃣ Detalhes das transações:');
    transactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.description}`);
      console.log(`      Tipo: ${tx.type}`);
      console.log(`      Valor: R$ ${tx.amount}`);
      console.log(`      Data: ${tx.date}`);
    });

    // 4. Testar com string (como pode estar vindo do req.user.id)
    console.log('\n5️⃣ Testando com userId como string:');
    const userIdString = '696d5261763edfd98a568766';
    const countWithString = await Transaction.countDocuments({ user: userIdString });
    console.log(`   Transações encontradas: ${countWithString}`);

    const statsWithString = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userIdString) } },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
            }
          },
          totalExpenses: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, 0]
            }
          }
        }
      }
    ]);

    console.log('   Resultado da agregação com string convertida:');
    console.log(`   Receitas: R$ ${statsWithString[0]?.totalIncome || 0}`);
    console.log(`   Despesas: R$ ${statsWithString[0]?.totalExpenses || 0}`);

    await mongoose.connection.close();
    console.log('\n✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testViniciusStats();
