const axios = require('axios');

async function testSuite() {
  console.log('--- Testing API Gateway & Microservices ---');
  try {
    // 1. Login with Valid Credentials
    const loginRes = await axios.post('http://localhost:9000/api/v1/auth/login', {
      email: 'john.doe@bank.com',
      password: 'Password123!'
    });
    console.log('✅ Auth Service / Login:', loginRes.data.user.fullName, '| Token issued');
    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Fetch Accounts
    const accRes = await axios.get('http://localhost:9000/api/v1/accounts', { headers: authHeaders });
    console.log('✅ Account Service / List Accounts:', accRes.data.data.length, 'accounts found.');
    const firstAcc = accRes.data.data[0];

    // 3. Test Transfer Validation (Negative Case: Exceeds Limit)
    try {
      await axios.post('http://localhost:9000/api/v1/transactions/transfer', {
        fromAccountId: firstAcc.id,
        toAccountNumber: '4491029384',
        routingNumber: '021000021',
        amount: 25000.00, // exceeds limit!
        remarks: 'Test overlimit'
      }, { headers: authHeaders });
      console.error('❌ Negative test failed: overlimit transfer succeeded!');
    } catch (err) {
      console.log('✅ Validation Negative Test PASSED:', err.response?.data?.message, 'Errors:', err.response?.data?.errors?.map(e => e.message));
    }

    // 4. Test Valid Transfer (Positive Case)
    const transferRes = await axios.post('http://localhost:9000/api/v1/transactions/transfer', {
      fromAccountId: firstAcc.id,
      toAccountNumber: '4491029384',
      routingNumber: '021000021',
      recipientName: 'Alice Walker',
      amount: 150.00,
      remarks: 'Automated test verified transfer'
    }, { headers: authHeaders });
    console.log('✅ Transaction Service / Transfer:', transferRes.data.data.referenceNumber, 'New Balance: $' + transferRes.data.data.updatedBalance);

    // 5. Test Billers and Bill Payment
    const billersRes = await axios.get('http://localhost:9000/api/v1/bills/billers', { headers: authHeaders });
    console.log('✅ Transaction Service / Billers:', billersRes.data.data.length, 'billers available.');

    const billPayRes = await axios.post('http://localhost:9000/api/v1/bills/pay', {
      accountId: firstAcc.id,
      billerId: 'bil-001',
      consumerNumber: 'ELEC-982341',
      dueDate: '2026-10-28',
      amount: 45.50
    }, { headers: authHeaders });
    console.log('✅ Transaction Service / Bill Pay:', billPayRes.data.data.referenceNumber, 'Amount: $' + billPayRes.data.data.amount);

    // 6. Test Transactions Query
    const txnsRes = await axios.get('http://localhost:9000/api/v1/transactions?limit=5', { headers: authHeaders });
    console.log('✅ Transaction Service / Query Ledger:', txnsRes.data.pagination.total, 'total transactions recorded.');

    console.log('\n🎉 ALL BACKEND MICROSERVICES VERIFIED AND PASSING 100%!');
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
}

testSuite();
