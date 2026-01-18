const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_dashboard';

// Credenciais do usuário Vinicius
const USER_CREDENTIALS = {
  email: 'vinifsilva2014@gmail.com',
  password: 'sua-senha-aqui' // VOCÊ PRECISA COLOCAR A SENHA REAL
};

async function testDelete() {
  let token = null;
  let testTransactionId = null;
  let testCategoryId = null;

  try {
    console.log('🧪 Testando funcionalidade de DELETE\n');

    // 1. Fazer login
    console.log('1️⃣ Fazendo login...');
    try {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, USER_CREDENTIALS);
      token = loginResponse.data.token;
      console.log('   ✅ Login bem-sucedido!\n');
    } catch (error) {
      console.log('   ❌ Erro no login:', error.response?.data?.message || error.message);
      console.log('   ⚠️  IMPORTANTE: Você precisa colocar a senha correta na linha 10!\n');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Criar uma categoria de teste
    console.log('2️⃣ Criando categoria de teste...');
    try {
      const categoryResponse = await axios.post(
        `${API_URL}/categories`,
        {
          name: 'Teste Delete',
          type: 'expense',
          color: '#FF0000',
          icon: 'test'
        },
        { headers }
      );
      testCategoryId = categoryResponse.data._id;
      console.log(`   ✅ Categoria criada: ${testCategoryId}\n`);
    } catch (error) {
      console.log('   ❌ Erro ao criar categoria:', error.response?.data?.message || error.message);
      console.log('   Detalhes:', error.response?.data);
      console.log('');
    }

    // 3. Criar uma transação de teste
    console.log('3️⃣ Criando transação de teste...');
    try {
      const transactionResponse = await axios.post(
        `${API_URL}/transactions`,
        {
          amount: -100,
          description: 'Teste Delete',
          type: 'expense',
          date: new Date().toISOString()
        },
        { headers }
      );
      testTransactionId = transactionResponse.data._id;
      console.log(`   ✅ Transação criada: ${testTransactionId}\n`);
    } catch (error) {
      console.log('   ❌ Erro ao criar transação:', error.response?.data?.message || error.message);
      console.log('   Detalhes:', error.response?.data);
      console.log('');
    }

    // 4. Tentar deletar a transação
    if (testTransactionId) {
      console.log('4️⃣ Tentando deletar transação...');
      try {
        const deleteResponse = await axios.delete(
          `${API_URL}/transactions/${testTransactionId}`,
          { headers }
        );
        console.log('   ✅ Transação deletada com sucesso!');
        console.log('   Resposta:', deleteResponse.data);
        console.log('');
      } catch (error) {
        console.log('   ❌ ERRO ao deletar transação!');
        console.log('   Status:', error.response?.status);
        console.log('   Mensagem:', error.response?.data?.message || error.message);
        console.log('   Detalhes completos:', error.response?.data);
        console.log('');
      }
    }

    // 5. Tentar deletar a categoria
    if (testCategoryId) {
      console.log('5️⃣ Tentando deletar categoria...');
      try {
        const deleteResponse = await axios.delete(
          `${API_URL}/categories/${testCategoryId}`,
          { headers }
        );
        console.log('   ✅ Categoria deletada com sucesso!');
        console.log('   Resposta:', deleteResponse.data);
        console.log('');
      } catch (error) {
        console.log('   ❌ ERRO ao deletar categoria!');
        console.log('   Status:', error.response?.status);
        console.log('   Mensagem:', error.response?.data?.message || error.message);
        console.log('   Detalhes completos:', error.response?.data);
        console.log('');
      }
    }

    // 6. Verificar se realmente foram deletados
    console.log('6️⃣ Verificando se foram realmente deletados...');
    
    if (testTransactionId) {
      try {
        await axios.get(`${API_URL}/transactions/${testTransactionId}`, { headers });
        console.log('   ⚠️  Transação ainda existe no banco!');
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('   ✅ Transação não existe mais (deletada com sucesso)');
        } else {
          console.log('   ❓ Erro ao verificar:', error.message);
        }
      }
    }

    if (testCategoryId) {
      try {
        await axios.get(`${API_URL}/categories/${testCategoryId}`, { headers });
        console.log('   ⚠️  Categoria ainda existe no banco!');
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('   ✅ Categoria não existe mais (deletada com sucesso)');
        } else {
          console.log('   ❓ Erro ao verificar:', error.message);
        }
      }
    }

    console.log('\n✅ Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
  }
}

// Verificar se a senha foi configurada
if (USER_CREDENTIALS.password === 'sua-senha-aqui') {
  console.log('⚠️  IMPORTANTE: Você precisa configurar a senha do usuário!');
  console.log('   Edite o arquivo test-delete.js na linha 10');
  console.log('   Coloque a senha do usuário vinifsilva2014@gmail.com\n');
} else {
  testDelete();
}
