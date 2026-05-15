import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function runDebugQueries() {
  console.log('🔍 QUERY DEBUG - HUNT MODELS\n');
  console.log('=' .repeat(80));

  // Query 1: Conta modelli con agency_id IS NULL
  console.log('\n1️⃣  MODELLI CON agency_id IS NULL:');
  console.log('-'.repeat(80));
  
  try {
    const { data: nullAgencyModels, error: error1 } = await supabase
      .from('models')
      .select('id, first_name, last_name, agency_id, school_id, agent_id')
      .is('agency_id', null);

    if (error1) {
      console.error('❌ Errore:', error1.message);
    } else {
      console.log(`📊 Totale modelli con agency_id IS NULL: ${nullAgencyModels.length}`);
      if (nullAgencyModels.length > 0) {
        console.log('\nDettagli:');
        nullAgencyModels.forEach((m, idx) => {
          console.log(`  ${idx + 1}. ${m.first_name} ${m.last_name}`);
          console.log(`     - Model ID: ${m.id}`);
          console.log(`     - School: ${m.school_id ? m.school_id : 'N/A'}`);
          console.log(`     - Agent: ${m.agent_id ? m.agent_id : 'N/A'}`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Errore:', err.message);
  }

  // Query 2: Per ogni modello con pagamenti, mostra model_id, model_name, agency_id, primo_pagamento
  console.log('\n\n2️⃣  MODELLI CON PAGAMENTI (e primo pagamento):');
  console.log('-'.repeat(80));

  try {
    const { data: modelsWithPayments, error: error2 } = await supabase
      .from('models')
      .select(`
        id,
        first_name,
        last_name,
        agency_id,
        contracts(
          id,
          payments(
            id,
            amount,
            paid_at
          )
        )
      `);

    if (error2) {
      console.error('❌ Errore:', error2.message);
    } else {
      // Filtra modelli che hanno pagamenti
      const modelsWithPay = modelsWithPayments.filter(m => 
        m.contracts && m.contracts.some(c => c.payments && c.payments.length > 0)
      );

      console.log(`📊 Totale modelli con pagamenti: ${modelsWithPay.length}`);
      
      if (modelsWithPay.length > 0) {
        console.log('\nDettagli (modelli ordinati per primo pagamento):');
        
        // Crea array di modelli con primo pagamento
        const modelsData = [];
        modelsWithPay.forEach(m => {
          let firstPayment = null;
          m.contracts.forEach(c => {
            if (c.payments && c.payments.length > 0) {
              c.payments.forEach(p => {
                if (!firstPayment || new Date(p.paid_at) < new Date(firstPayment.paid_at)) {
                  firstPayment = p;
                }
              });
            }
          });
          
          if (firstPayment) {
            modelsData.push({
              modelId: m.id,
              modelName: `${m.first_name} ${m.last_name}`,
              agencyId: m.agency_id || 'NULL',
              firstPaymentAmount: firstPayment.amount,
              firstPaymentDate: firstPayment.paid_at
            });
          }
        });

        // Ordina per data primo pagamento
        modelsData.sort((a, b) => new Date(a.firstPaymentDate) - new Date(b.firstPaymentDate));

        modelsData.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.modelName}`);
          console.log(`     - Model ID: ${item.modelId}`);
          console.log(`     - Agency ID: ${item.agencyId}`);
          console.log(`     - Primo Pagamento: €${item.firstPaymentAmount} (${item.firstPaymentDate})`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Errore:', err.message);
  }

  // Query 3: Verifica se payment_commissions ritorna dati
  console.log('\n\n3️⃣  VIEW payment_commissions - VERIFICA DATI:');
  console.log('-'.repeat(80));

  try {
    // Fai una query diretta alla view usando RPC o diretto select
    const { data: commissions, error: error3, count } = await supabase
      .from('payment_commissions')
      .select('*', { count: 'exact' })
      .limit(10);

    if (error3) {
      console.error('❌ Errore:', error3.message);
    } else {
      console.log(`✅ VIEW payment_commissions è ACCESSIBILE`);
      console.log(`📊 Totale righe nella view: ${count}`);
      
      if (count > 0) {
        console.log(`\nPrime 10 righe di payment_commissions:`);
        commissions.forEach((row, idx) => {
          console.log(`\n  ${idx + 1}. Payment ID: ${row.payment_id}`);
          console.log(`     - Model: ${row.model_name} (${row.model_id})`);
          console.log(`     - Amount: €${row.amount}`);
          console.log(`     - Contract Status: ${row.contract_status}`);
          console.log(`     - Agency: ${row.agency_name || 'N/A'}`);
          console.log(`     - School: ${row.school_name || 'N/A'}`);
          console.log(`     - Agent: ${row.agent_name || 'N/A'}`);
          if (row.md_amount) console.log(`     - MD Amount: €${row.md_amount}`);
          if (row.agent_amount) console.log(`     - Agent Amount: €${row.agent_amount}`);
        });
      } else {
        console.log('⚠️  La view è vuota (nessun pagamento con paid_at valido)');
      }
    }
  } catch (err) {
    console.error('❌ Errore:', err.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Query debug completate!\n');
  process.exit(0);
}

runDebugQueries().catch(err => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
