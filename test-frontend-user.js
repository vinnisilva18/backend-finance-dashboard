const http = require('http');

// Configuração - IMPORTANTE: Use as credenciais do seu usuário real do frontend
const BASE_URL = 'http://localhost:3000';
const FRONTEND_USER = {
  email: 'seu-email@example.com',  // ALTERE PARA O EMAIL DO SEU USUÁRIO
  password: 'sua-senha'              // ALTERE PARA A SENHA DO SEU USUÁRIO
};

// Função auxiliar para fazer requisições HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testFrontendUser() {
  console.log('🧪 Testando usuário do frontend...\n');
  
  try {
    // 1. Fazer Login
    console.log('1️⃣ Fazendo login com usuário do frontend...');
    console.log(`   Email: ${FRONTEND_USER.email}`);
    
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: FRONTEND_USER
    });
    
    if (loginResponse.status !== 200) {
      console.log('   ❌ Login falhou!');
      console.log('   Resposta:', JSON.stringify(loginResponse.data, null, 2));
      console.log('\n⚠️  IMPORTANTE: Verifique se você alterou o email e senha no script!');
      return;
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log(`   ✅ Login bem-sucedido!`);
    console.log(`   Usuário: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);

    // 2. Buscar transações
    console.log('2️⃣ Buscando transações do usuário...');
    const transactionsResponse = await makeRequest(`${BASE_URL}/api/transactions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const transactions = transactionsResponse.data;
    console.log(`   Total de transações encontradas: ${transactions.length}`);
    
    if (transactions.length > 0) {
      console.log('\n   📋 Primeiras 5 transações:');
      transactions.slice(0, 5).forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.description} - R$ ${tx.amount} (${tx.type})`);
      });
    } else {
      console.log('   ⚠️  Nenhuma transação encontrada para este usuário');
    }

    // 3. Buscar estatísticas do usuário
    console.log('\n3️⃣ Buscando estatísticas do dashboard...');
    const statsResponse = await makeRequest(`${BASE_URL}/api/user/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const stats = statsResponse.data;
    console.log('   📊 Estatísticas do Dashboard:');
    console.log(`   Total de Transações: ${stats.totalTransactions}`);
    console.log(`   Total de Receitas: R$ ${stats.totalIncome.toFixed(2)}`);
    console.log(`   Total de Despesas: R$ ${stats.totalExpenses.toFixed(2)}`);
    console.log(`   Total de Economias: R$ ${stats.totalSavings.toFixed(2)}`);
    console.log(`   Categorias: ${stats.totalCategories}`);
    console.log(`   Metas Ativas: ${stats.activeGoals}`);
    console.log(`   Cartões: ${stats.creditCards}`);

    // 4. Buscar estatísticas de transações
    console.log('\n4️⃣ Buscando estatísticas de transações...');
    const txStatsResponse = await makeRequest(`${BASE_URL}/api/transactions/stats/summary`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const txStats = txStatsResponse.data;
    console.log('   📊 Estatísticas de Transações:');
    console.log(`   Total de Receitas: R$ ${txStats.totalIncome.toFixed(2)}`);
    console.log(`   Total de Despesas: R$ ${txStats.totalExpenses.toFixed(2)}`);
    console.log(`   Saldo Líquido: R$ ${txStats.netSavings.toFixed(2)}`);
    console.log(`   Contagem: ${txStats.count}`);

    // 5. Comparar resultados
    console.log('\n5️⃣ Comparando resultados...');
    console.log(`   ${stats.totalTransactions === txStats.count ? '✅' : '❌'} Contagem de transações coincide`);
    console.log(`   ${stats.totalIncome === txStats.totalIncome ? '✅' : '❌'} Receitas coincidem`);
    console.log(`   ${stats.totalExpenses === txStats.totalExpenses ? '✅' : '❌'} Despesas coincidem`);
    
    if (stats.totalTransactions === 0) {
      console.log('\n⚠️  ATENÇÃO: Este usuário não tem transações!');
      console.log('   Por isso o dashboard mostra R$ 0,00');
      console.log('   Adicione transações através do frontend para ver os valores atualizarem.');
    } else if (stats.totalIncome === 0 && stats.totalExpenses === 0) {
      console.log('\n⚠️  ATENÇÃO: As transações existem mas os valores estão zerados!');
      console.log('   Isso pode indicar um problema com o tipo das transações.');
    } else {
      console.log('\n✅ Tudo funcionando corretamente!');
      console.log('   O dashboard deveria mostrar estes valores.');
    }

  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error.message);
  }
}

// Executar testes
console.log('⚠️  IMPORTANTE: Antes de executar, altere o email e senha no script!');
console.log('   Linha 6-7: FRONTEND_USER = { email: "...", password: "..." }\n');
testFrontendUser();
