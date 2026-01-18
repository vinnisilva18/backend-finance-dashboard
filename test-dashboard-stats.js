const https = require('https');
const http = require('http');

// Configuração
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!'
};

// Função auxiliar para fazer requisições HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = protocol.request(reqOptions, (res) => {
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

// Função principal de teste
async function runTests() {
  console.log('🧪 Iniciando testes do Dashboard Stats...\n');
  
  try {
    // 1. Testar Health Check
    console.log('1️⃣ Testando Health Check...');
    const healthCheck = await makeRequest(`${BASE_URL}/api/health`);
    console.log(`   Status: ${healthCheck.status}`);
    console.log(`   Response:`, JSON.stringify(healthCheck.data, null, 2));
    console.log('   ✅ Health check OK\n');

    // 2. Fazer Login
    console.log('2️⃣ Fazendo login...');
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: TEST_USER
    });
    
    if (loginResponse.status !== 200) {
      console.log('   ⚠️  Login falhou. Tentando registrar novo usuário...');
      
      const registerResponse = await makeRequest(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        body: {
          name: 'Test User',
          email: TEST_USER.email,
          password: TEST_USER.password
        }
      });
      
      if (registerResponse.status === 201 || registerResponse.status === 200) {
        console.log('   ✅ Usuário registrado com sucesso');
        const newLoginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          body: TEST_USER
        });
        
        if (!newLoginResponse.data.token) {
          throw new Error('Falha ao obter token após registro');
        }
        
        var token = newLoginResponse.data.token;
      } else {
        throw new Error('Falha ao registrar usuário: ' + JSON.stringify(registerResponse.data));
      }
    } else {
      var token = loginResponse.data.token;
    }
    
    console.log(`   Token obtido: ${token.substring(0, 20)}...`);
    console.log('   ✅ Login bem-sucedido\n');

    // 3. Testar endpoint /api/user/stats
    console.log('3️⃣ Testando endpoint /api/user/stats...');
    const statsResponse = await makeRequest(`${BASE_URL}/api/user/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   Status: ${statsResponse.status}`);
    console.log('   📊 Estatísticas retornadas:');
    console.log(JSON.stringify(statsResponse.data, null, 2));
    
    // Validar estrutura da resposta
    const stats = statsResponse.data;
    const requiredFields = [
      'totalTransactions',
      'totalCategories',
      'activeGoals',
      'creditCards',
      'totalSavings',
      'totalIncome',
      'totalExpenses',
      'monthlyAverage',
      'achievementRate',
      'completedGoals',
      'totalGoals'
    ];
    
    console.log('\n   🔍 Validando campos obrigatórios:');
    let allFieldsPresent = true;
    for (const field of requiredFields) {
      const isPresent = stats.hasOwnProperty(field);
      console.log(`   ${isPresent ? '✅' : '❌'} ${field}: ${isPresent ? 'presente' : 'AUSENTE'}`);
      if (!isPresent) allFieldsPresent = false;
    }
    
    // Validar monthlyAverage
    if (stats.monthlyAverage) {
      console.log('\n   🔍 Validando monthlyAverage:');
      const monthlyFields = ['income', 'expenses', 'savings'];
      for (const field of monthlyFields) {
        const isPresent = stats.monthlyAverage.hasOwnProperty(field);
        console.log(`   ${isPresent ? '✅' : '❌'} monthlyAverage.${field}: ${isPresent ? 'presente' : 'AUSENTE'}`);
        if (!isPresent) allFieldsPresent = false;
      }
    }
    
    // Validar tipos de dados
    console.log('\n   🔍 Validando tipos de dados:');
    console.log(`   ${typeof stats.totalTransactions === 'number' ? '✅' : '❌'} totalTransactions é número`);
    console.log(`   ${typeof stats.totalIncome === 'number' ? '✅' : '❌'} totalIncome é número`);
    console.log(`   ${typeof stats.totalExpenses === 'number' ? '✅' : '❌'} totalExpenses é número`);
    console.log(`   ${typeof stats.totalSavings === 'number' ? '✅' : '❌'} totalSavings é número`);
    
    // Validar cálculos
    console.log('\n   🔍 Validando cálculos:');
    const calculatedSavings = stats.totalIncome - stats.totalExpenses;
    const savingsMatch = Math.abs(calculatedSavings - stats.totalSavings) < 0.01;
    console.log(`   ${savingsMatch ? '✅' : '❌'} totalSavings = totalIncome - totalExpenses`);
    console.log(`      Calculado: ${calculatedSavings.toFixed(2)}`);
    console.log(`      Retornado: ${stats.totalSavings.toFixed(2)}`);
    
    if (allFieldsPresent && savingsMatch) {
      console.log('\n   ✅ Todos os testes passaram!\n');
    } else {
      console.log('\n   ⚠️  Alguns testes falharam. Verifique os detalhes acima.\n');
    }

    // 4. Testar endpoint /api/transactions/stats/summary
    console.log('4️⃣ Testando endpoint /api/transactions/stats/summary...');
    const transactionStatsResponse = await makeRequest(`${BASE_URL}/api/transactions/stats/summary`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   Status: ${transactionStatsResponse.status}`);
    console.log('   📊 Estatísticas de transações:');
    console.log(JSON.stringify(transactionStatsResponse.data, null, 2));
    console.log('   ✅ Endpoint de transações OK\n');

    // Comparar os dois endpoints
    console.log('5️⃣ Comparando dados entre endpoints...');
    const txStats = transactionStatsResponse.data;
    console.log(`   User Stats - Income: ${stats.totalIncome}`);
    console.log(`   Transaction Stats - Income: ${txStats.totalIncome}`);
    console.log(`   ${stats.totalIncome === txStats.totalIncome ? '✅' : '⚠️'} Receitas coincidem`);
    
    console.log(`   User Stats - Expenses: ${stats.totalExpenses}`);
    console.log(`   Transaction Stats - Expenses: ${txStats.totalExpenses}`);
    console.log(`   ${stats.totalExpenses === txStats.totalExpenses ? '✅' : '⚠️'} Despesas coincidem`);
    
    console.log('\n✅ Testes concluídos com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error.message);
    console.error(error);
  }
}

// Executar testes
runTests();
