(function(){
  'use strict';
  // FinançasPRO core 4.7.1

  const Engine = {};
  const amount = t => Math.max(0, Number(t?.valorParcela ?? t?.valorTotal ?? 0) || 0);
  const isInvestmentAsset=p=>{
    if(!p||p.classe!=='Ativo') return false;
    const cat=String(p.categoria||'').toLocaleLowerCase('pt-BR');
    const nome=String(p.nome||'').toLocaleLowerCase('pt-BR');
    if(['imóvel','imovel','imoveis','imóveis'].some(k=>cat.includes(k))) return false;
    return p.investivel===true || ['renda fixa','reserva de emergência','ações','fiis','criptoativos','investimentos','investimento','cdb','lci','lca','tesouro','fundo','fundos','previdência','previdencia','cripto','bitcoin'].some(k=>cat.includes(k)||nome.includes(k));
  };
  const parseDate = s => { if(!s) return null; const [y,m,d]=String(s).split('-').map(Number); if(!y||!m||!d)return null; return new Date(y,m-1,d); };
  const addMonths = (date,n)=>{const d=new Date(date); d.setDate(1); d.setMonth(d.getMonth()+n); return d;};
  const monthKey=(y,m)=>`${y}-${String(m).padStart(2,'0')}`;
  const isActive=t=>t && t.status!=='Cancelada';

  Engine.isInvestmentAsset=isInvestmentAsset;

  Engine.monthlyTotals=function(data,y,m){
    const tx=(data.transacoes||[]).filter(t=>isActive(t)&&(()=>{const d=parseDate(t.dataCompra);return d&&d.getFullYear()===y&&d.getMonth()+1===m})());
    const sum=type=>tx.filter(t=>t.tipo===type).reduce((s,t)=>s+amount(t),0);
    const receitas=sum('receita'), despesas=sum('despesa'), investimentos=sum('investimento')+sum('poupanca'), pagamentos=sum('pagamento_cartao'), transferencias=sum('transferencia');
    const fluxoCaixa=tx.reduce((s,t)=>{
      if(t.cashImpact!==null&&t.cashImpact!==undefined)return s+(Number(t.cashImpact)||0);
      if(t.tipo==='receita')return s+amount(t);
      if(t.tipo==='despesa'||t.tipo==='investimento'||t.tipo==='pagamento_cartao')return s-amount(t);
      return s;
    },0);
    return {receitas,despesas,investimentos,pagamentosCartao:pagamentos,transferencias,resultado:receitas-despesas,taxaEconomia:receitas?((receitas-despesas)/receitas)*100:0,fluxoCaixa,fluxoLivre:receitas-despesas-investimentos-pagamentos};
  };

  const monthlyRate=a=>{const r=Math.max(0,Number(a)||0)/100;return Math.pow(1+r,1/12)-1};
  const simulateFinancing=(f, opts={})=>{
    if(!f)return null;
    const saldoInicial=Math.max(0,Number(opts.saldoInicial??f.saldoDevedor??opts.valor??0)||0);
    const taxa=monthlyRate(f.taxaJurosAnual);
    const sistema=String(opts.sistema??f.sistemaAmortizacao??'price').toLowerCase()==='sac'?'sac':'price';
    const n0=Math.max(0,Number(opts.parcelasRestantes??(Number(f.parcelasTotal||0)-Number(f.parcelasPagas||0))));
    const parcelaInformada=Math.max(0,Number(opts.parcela??f.parcelaMensal)||0);
    if(saldoInicial<=0)return {saldoInicial,meses:0,juros:0,parcelas:[],sistema,taxa,parcelaInicial:0,parcelaFinal:0};
    if(n0<=0)return {saldoInicial,meses:0,juros:0,parcelas:[],sistema,taxa,parcelaInicial:0,parcelaFinal:0};
    const out=[];let saldo=saldoInicial,jurosTotal=0,meses=0;
    const amortBase=sistema==='sac'?(Number(opts.sacAmortizationBase)>0?Number(opts.sacAmortizationBase):saldoInicial/n0):null;
    while(saldo>0.01&&meses<1200){
      const juros=saldo*taxa;
      let amort,parcela;
      if(sistema==='sac'){amort=Math.min(saldo,amortBase||saldo);parcela=juros+amort;}
      else{parcela=parcelaInformada;if(!(parcela>0))return {saldoInicial,meses:Infinity,juros:Infinity,parcelas:[],sistema,taxa,parcelaInicial:0,parcelaFinal:0,semAmortizacao:true};amort=Math.min(saldo,Math.max(0,parcela-juros));}
      if(amort<=0)return {saldoInicial,meses:Infinity,juros:Infinity,parcelas:[],sistema,taxa,parcelaInicial:parcela,parcelaFinal:parcela,semAmortizacao:true};
      saldo=Math.max(0,saldo-amort);jurosTotal+=juros;meses++;out.push({mes:meses,juros,amortizacao:amort,parcela,saldo});
    }
    return {saldo:saldoInicial,meses,juros:jurosTotal,parcelas:out,sistema,taxa,parcelaInicial:out[0]?.parcela||0,parcelaFinal:out.at(-1)?.parcela||0, saldoFinal:saldo};
  };
  const futureInterest=(p)=>{const f=p?.financiamento;if(!f)return 0;const saldo=Math.max(0,Number(f.saldoDevedor ?? p.valor ?? f.valorFinanciado ?? 0)||0);const sim=simulateFinancing(f,{saldoInicial:saldo});return sim?.juros??0;};
  Engine.monthlyRate=monthlyRate;
  Engine.simulateFinancing=simulateFinancing;
  Engine.futureInterest=futureInterest;

  Engine.netWorth=function(data){
    let bruto=0,dividas=0,jurosFuturos=0;
    for(const p of (data.patrimonio||[])){const v=p.classe==='Passivo'&&p.financiamento?Math.max(0,Number(p.financiamento.saldoDevedor ?? p.valor ?? p.financiamento.valorFinanciado ?? 0)||0):Math.abs(Number(p.valor)||0); if(p.classe==='Passivo'){dividas+=v; const j=futureInterest(p); if(Number.isFinite(j)) jurosFuturos+=j;} else bruto+=Math.max(0,Number(p.valorAtual ?? p.valor)||0);}
    return {bruto,dividas,liquido:bruto-dividas,jurosFuturos,compromissoDividas:dividas+jurosFuturos};
  };
  Engine.investable=function(data){
    return (data.patrimonio||[]).filter(isInvestmentAsset).reduce((s,p)=>s+Math.max(0,Number(p.valorAtual ?? p.valor)||0),0);
  };
  Engine.liquid=function(data){
    return (data.patrimonio||[]).filter(p=>p.classe==='Ativo'&&!['imóvel','imoveis','imóveis'].includes(String(p.categoria||'').toLocaleLowerCase('pt-BR'))&&['100%','Alta','D+0','D+1'].includes(String(p.liquidez||''))).reduce((s,p)=>s+Math.max(0,Number(p.valorAtual ?? p.valor)||0),0);
  };
  Engine.emergency=function(data){
    return (data.patrimonio||[]).filter(p=>p.classe==='Ativo'&&(p.reservaEmergencia===true||String(p.categoria||'').toLowerCase().includes('reserva de emergência'))).reduce((s,p)=>s+Math.max(0,Number(p.valorAtual ?? p.valor)||0),0);
  };
  // Canonical public names used by invariants and future consumers.
  Engine.liquidAssets=function(data){return Engine.liquid(data);};
  Engine.emergencyReserve=function(data){return Engine.emergency(data);};


  Engine.budgetState=function(data,y,m,cat){
    const key=`${monthKey(y,m)}::${String(cat).toLowerCase()}`;
    const current=data.orcamentoControle?.[key]||{};
    let carry=0;
    // Soma todas as pendências abertas anteriores, não apenas o último mês.
    for(let i=1;i<=60;i++){
      const d=addMonths(new Date(y,m-1,1),-i), k=`${monthKey(d.getFullYear(),d.getMonth()+1)}::${String(cat).toLowerCase()}`;
      const s=data.orcamentoControle?.[k];
      if(s) carry += Math.max(0,Number(s.pendenteMes??s.pendente??0)||0);
    }
    const realizado=Math.max(0,Number(current.realizadoMes)||0);
    const pago=Math.max(0,Number(current.pagoMes??current.pago)||0);
    const compromisso=carry+realizado;
    const pendente=Math.max(0,compromisso-pago);
    return {...current,pendenteAnterior:carry,realizadoMes:realizado,pagoMes:pago,pendenteMes:Math.max(0,pendente),pendenteAcumulado:Math.max(0,pendente)};
  };

  Engine.cardOutstanding=function(data,card){
    const id=String(card?.id);
    const invoiceTotals=new Map();
    const cardObj=card;
    for(const t of (data.transacoes||[])){
      if(!isActive(t)||t.tipo!=='despesa'||t.formaPagto!=='Cartão'||String(t.cartaoId)!==id)continue;
      let k=null;
      if(t.isFaturaCartao===true && t.faturaMes) k=String(t.faturaMes);
      else {const d=parseDate(t.dataCompra);if(!d)continue;let y=d.getFullYear(),m=d.getMonth()+1;if(d.getDate()>Number(cardObj?.fechamento||31)){m++;if(m===13){m=1;y++}}k=`${y}-${String(m).padStart(2,'0')}`;}
      invoiceTotals.set(k,(invoiceTotals.get(k)||0)+amount(t));
    }
    let outstanding=0;
    for(const [key,total] of invoiceTotals){const paid=(data.pagamentosFatura||[]).filter(p=>String(p.cartaoId)===id&&p.faturaMes===key).reduce((s,p)=>s+Math.max(0,Number(p.valor)||0),0);outstanding+=Math.max(0,total-paid);}
    const future=(card?.compromissosFuturos||[]).reduce((s,c)=>s+Math.max(0,Number(c.valorMensal)||0)*Math.max(0,Number(c.meses)||0),0);
    return Math.max(0,outstanding+future);
  };

  Engine.goalBalance=function(data,meta){
    const initial=Math.max(0,Number(meta.saldoInicial??meta.acumulado??0)||0);
    const linked=(data.transacoes||[]).filter(t=>isActive(t)&&String(t.metaId)===String(meta.id)&&['investimento','poupanca'].includes(t.tipo)).reduce((s,t)=>s+amount(t),0);
    return Math.max(0,initial+linked);
  };

  Engine.reconcileGoals=function(data){
    for(const m of (data.metas||[])) m.acumulado=Engine.goalBalance(data,m);
  };

  Engine.projectCash=function(data,months,options={}){
    const now=new Date();now.setHours(0,0,0,0);
    const nMonths=Math.max(1,Math.min(24,Number(months)||3));
    const cashAssets=(data.patrimonio||[]).filter(p=>p.classe==='Ativo'&&['dinheiro em conta','conta corrente','caixa','dinheiro'].some(k=>String(p.categoria||p.nome||'').toLowerCase().includes(k))).reduce((s,p)=>s+Math.max(0,Number(p.valorAtual??p.valor)||0),0);
    const realizedFlow=(data.transacoes||[]).filter(t=>isActive(t)&&parseDate(t.dataCompra)).filter(t=>parseDate(t.dataCompra).getTime()<=now.getTime()).reduce((s,t)=>{
      if(t.cashImpact!==null&&t.cashImpact!==undefined)return s+Number(t.cashImpact||0);
      if(t.tipo==='receita')return s+amount(t);
      if(t.tipo==='despesa'&&t.formaPagto!=='Cartão')return s-amount(t);
      if(['investimento','pagamento_cartao','amortizacao'].includes(t.tipo))return s-amount(t);
      if(t.tipo==='resgate')return s+Math.max(0,Number(t.valorLiquidoResgate??amount(t))||0);
      return s;
    },0);
    const carryForward=Number(options?.carryForward)||0;
    const hasBaseOverride=options&&Number.isFinite(Number(options.baseOverride));
    const baseSaldo=hasBaseOverride?Number(options.baseOverride):(cashAssets>0?cashAssets:realizedFlow);
    // Quando baseOverride é informado, ele é a única fonte do saldo-base da projeção.
    // Isso permite carregar explicitamente a sobra positiva/negativa do mês de referência
    // sem misturá-la ao fluxo histórico acumulado até hoje.
    let saldo=baseSaldo;
    const investmentBalances=new Map();
    for(const p of (data.patrimonio||[])){
      if(!isInvestmentAsset(p))continue;
      const v=Math.max(0,Number(p.valorAtual??p.valor)||0);if(v<=0)continue;
      investmentBalances.set(String(p.id),{saldo:v,taxaAnual:Math.max(0,Number(p.rentabilidadeAnual)||0)/100,nome:p.nome||'Investimento'});
    }
    const txMonth=t=>{const dt=parseDate(t.dataCompra);return dt?monthKey(dt.getFullYear(),dt.getMonth()+1):null};
    const items=[];let totalRendimento=0,totalResgates=0,totalAportes=0;
    for(let i=1;i<=nMonths;i++){
      const d=addMonths(new Date(now.getFullYear(),now.getMonth(),1),i),y=d.getFullYear(),m=d.getMonth()+1,key=monthKey(y,m);
      const future=(data.transacoes||[]).filter(t=>isActive(t)&&txMonth(t)===key);
      let receitas=0,despesas=0,investimentos=0,pagamentos=0,amortizacoes=0,resgates=0,rendimentos=0;
      for(const t of future){
        if(t.tipo==='receita')receitas+=amount(t);
        else if(t.tipo==='despesa'&&t.formaPagto!=='Cartão')despesas+=amount(t);
        else if(t.tipo==='investimento')investimentos+=amount(t);
        else if(t.tipo==='amortizacao')amortizacoes+=amount(t);
      }
      const cardInvoices=new Map();
      for(const t of (data.transacoes||[])){
        if(!isActive(t)||t.tipo!=='despesa'||t.formaPagto!=='Cartão')continue;
        let invKey=null;
        if(t.isFaturaCartao===true&&t.faturaMes)invKey=String(t.faturaMes);
        else{
          const card=(data.cartoes||[]).find(c=>String(c.id)===String(t.cartaoId));const dt=parseDate(t.dataCompra);if(!dt||!card)continue;
          const close=Math.max(1,Number(card.fechamento)||10),inv=dt.getDate()>close?addMonths(new Date(dt.getFullYear(),dt.getMonth(),1),1):new Date(dt.getFullYear(),dt.getMonth(),1);
          invKey=monthKey(inv.getFullYear(),inv.getMonth()+1);
        }
        if(invKey!==key)continue;const cid=String(t.cartaoId);cardInvoices.set(cid,(cardInvoices.get(cid)||0)+amount(t));
      }
      for(const [cid,total] of cardInvoices){
        let paid=(data.pagamentosFatura||[]).filter(p=>String(p.cartaoId)===cid&&p.faturaMes===key).reduce((s,p)=>s+Math.max(0,Number(p.valor)||0),0);
        if(paid<=0)paid=(data.transacoes||[]).filter(t=>isActive(t)&&t.tipo==='pagamento_cartao'&&String(t.cartaoId)===cid&&t.faturaMes===key).reduce((s,t)=>s+amount(t),0);
        pagamentos+=Math.max(0,total-paid);
      }
      for(const t of future){
        if(t.tipo==='investimento'){
          const pid=String(t.patrimonioId||'');
          if(pid&&investmentBalances.has(pid))investmentBalances.get(pid).saldo+=amount(t);
          totalAportes+=amount(t);
        }else if(t.tipo==='resgate'){
          let remaining=amount(t),requested=remaining,pid=String(t.patrimonioId||'');
          if(pid&&investmentBalances.has(pid)){
            const rec=investmentBalances.get(pid),withdrawal=Math.min(rec.saldo,remaining);rec.saldo=Math.max(0,rec.saldo-withdrawal);remaining-=withdrawal;
          }else{
            for(const rec of investmentBalances.values()){const withdrawal=Math.min(rec.saldo,remaining);rec.saldo=Math.max(0,rec.saldo-withdrawal);remaining-=withdrawal;if(remaining<=0)break;}
          }
          const effective=Math.max(0,requested-remaining);resgates+=effective;totalResgates+=effective;
        }
      }
      for(const rec of investmentBalances.values()){
        if(rec.saldo<=0||rec.taxaAnual<=0)continue;
        const monthlyRate=Math.pow(1+rec.taxaAnual,1/12)-1,gain=rec.saldo*monthlyRate;rec.saldo+=gain;rendimentos+=gain;
      }
      totalRendimento+=rendimentos;
      const fluxo=receitas-despesas-investimentos-pagamentos-amortizacoes+resgates;saldo+=fluxo;
      let patrimonioInvestimentos=0;for(const rec of investmentBalances.values())patrimonioInvestimentos+=Math.max(0,rec.saldo);
      items.push({year:y,month:m,label:new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),receitas,despesas,investimentos,pagamentos,amortizacoes,resgates,rendimentos,patrimonioInvestimentos,fluxo,saldo});
    }
    const ultimo=items.at(-1);
    return {base:baseSaldo,baseCaixa:baseSaldo,carryForward:hasBaseOverride?baseSaldo:0,ignoredCarryForward:hasBaseOverride?0:carryForward,items,totalRendimento,totalResgates,totalAportes,investimentoProjetado:ultimo?ultimo.patrimonioInvestimentos:0};
  };
  Engine.ledgerEntries=function(data){return Engine.ledger(data);};
  Engine.ledgerBalance=function(data){return Engine.ledgerEntries(data).reduce((s,e)=>s+e.cashImpact,0)};

  // Motor consolidado 3.6.10: uma única fonte de verdade para financiamento,
  // ledger e reconciliação. Valores monetários permanecem em BRL, sem arredondar
  // prematuramente durante os cálculos.
  Engine.financingState=function(p){
    const f=p?.financiamento;
    if(!f)return null;
    const saldo=Math.max(0,Number(f.saldoDevedor ?? p.valor ?? f.valorFinanciado ?? 0)||0);
    const pagos=Math.max(0,Number(f.parcelasPagas)||0);
    const total=Math.max(pagos,Number(f.parcelasTotal)||pagos);
    const rest=Math.max(0,total-pagos);
    const sim=Engine.simulateFinancing(f,{saldoInicial:saldo,parcelasRestantes:rest});
    const juros=Number.isFinite(sim?.juros)?sim.juros:Infinity;
    return {saldo,pagos,total,rest,juros,compromisso:Number.isFinite(juros)?saldo+juros:Infinity,sistema:sim?.sistema||'price',taxaMensal:sim?.taxa||0,parcela:sim?.parcelaInicial||Number(f.parcelaMensal)||0,meses:sim?.meses??rest,sim};
  };
  Engine.applyFinancingPayment=function(p,valor){
    const f=p?.financiamento; if(!f)return null;
    const state=Engine.financingState(p); if(!state)return null;
    const pagamento=Math.max(0,Number(valor)||0); if(pagamento<=0)return null;
    const juros=Math.min(state.saldo,state.saldo*state.taxaMensal);
    let amort;
    if(state.sistema==='sac'){
      const base=Math.min(state.saldo,Number(f.amortizacaoSACAtual||f.valorFinanciado||state.saldo)/Math.max(1,state.total));
      amort=Math.min(state.saldo,base);
    }else amort=Math.min(state.saldo,Math.max(0,pagamento-juros));
    return {juros,amortizacao:amort,novoSaldo:Math.max(0,state.saldo-amort),pagamento,semAmortizacao:amort<=0};
  };
  Engine.calculateInvestmentTax=function({bruto=0,custo=0,dias=0,regime='renda_fixa_regressiva',categoria=''}){
    bruto=Math.max(0,Number(bruto)||0); custo=Math.max(0,Number(custo)||0); dias=Math.max(0,Number(dias)||0);
    const rendimento=Math.max(0,bruto-custo);
    const cat=String(categoria).toLocaleLowerCase('pt-BR');
    const isento=String(regime).toLowerCase()==='isento'||cat.includes('lci')||cat.includes('lca');
    let ir=0,iof=0;
    if(!isento){
      const aliq=dias<=180?.225:dias<=360?.20:dias<=720?.175:.15;
      if(String(regime).toLowerCase().includes('renda_fixa'))ir=rendimento*aliq;
      if(dias<30){const tabela=[.96,.93,.90,.86,.83,.80,.76,.73,.70,.66,.63,.60,.56,.53,.50,.46,.43,.40,.36,.33,.30,.26,.23,.20,.16,.13,.10,.06,.03,0];iof=rendimento*(tabela[Math.min(29,Math.floor(dias))]||0);}
    }
    return {bruto,custo,rendimento,ir,iof,liquido:Math.max(0,bruto-ir-iof)};
  };
  Engine.ledger=function(data){
    const rows=[];
    for(const t of (data.transacoes||[])){
      if(!t||t.status==='Cancelada')continue;
      const valor=Math.max(0,Number(t.valorParcela??t.valorTotal??0)||0);
      let cash=Number(t.cashImpact);
      if(!Number.isFinite(cash)){
        if(t.tipo==='receita')cash=valor;
        else if(t.tipo==='despesa'||t.tipo==='investimento'||t.tipo==='pagamento_cartao'||t.tipo==='amortizacao')cash=-valor;
        else if(t.tipo==='resgate')cash=Number(t.valorLiquidoResgate??valor)||0;
        else cash=0;
      }
      rows.push({id:String(t.id),data:t.dataCompra||null,tipo:t.tipo,descricao:t.descricao||'',valor,cashImpact:cash,categoria:t.categoria||'',cartaoId:t.cartaoId??null,faturaMes:t.faturaMes??null,patrimonioId:t.patrimonioId??null,metaId:t.metaId??null,financiamentoId:t.financiamentoId??null,referenciaId:t.pagamentoFaturaId||t.recurrenceId||null});
    }
    return rows;
  };
  Engine.audit=function(data){
    const errors=[],warnings=[]; const inv=Engine.invariants(data);
    inv.filter(x=>!x.ok).forEach(x=>errors.push(x.name));
    const ids=new Set();
    for(const e of Engine.ledger(data)){if(ids.has(e.id))errors.push(`Ledger: operação duplicada ${e.id}`);ids.add(e.id);}
    const duplicateMap=new Map();
    const txs=(data.transacoes||[]).filter(isActive);
    for(const t of txs){
      const key=[t.dataCompra||'',t.tipo||'',String(t.descricao||'').trim().toLowerCase(),Number(amount(t)).toFixed(2),String(t.categoria||'').trim().toLowerCase(),String(t.cartaoId||''),String(t.metaId||''),String(t.financiamentoId||'')].join('|');
      if(!duplicateMap.has(key))duplicateMap.set(key,[]);
      duplicateMap.get(key).push(t);
    }
    const duplicates=[];
    for(const list of duplicateMap.values()){
      if(list.length>1){
        duplicates.push({ids:list.map(t=>String(t.id)),valor:amount(list[0]),motivo:'Transações muito semelhantes',descricao:`${list[0].dataCompra||'Sem data'} · ${list[0].descricao||'Sem descrição'} · ${list[0].categoria||'Sem categoria'} · ${list.length} registros com mesmo valor e contexto`});
      }
    }
    const invoiceMap=new Map();
    for(const t of txs){
      if(t.isFaturaCartao===true && t.formaPagto==='Cartão' && t.cartaoId && t.faturaMes){
        const key=`${t.cartaoId}|${t.faturaMes}`;
        if(!invoiceMap.has(key)) invoiceMap.set(key,[]);
        invoiceMap.get(key).push(t);
      }
    }
    for(const [key,list] of invoiceMap){
      if(list.length>1){
        warnings.push(`Fatura duplicada: cartão ${key.split('|')[0]} possui ${list.length} lançamentos para ${key.split('|')[1]}.`);
        duplicates.push({ids:list.map(t=>String(t.id)),valor:list.reduce((s,t)=>s+amount(t),0),motivo:'Mais de uma fatura para o mesmo cartão e mês',descricao:`Cartão ${key.split('|')[0]} · ${key.split('|')[1]} · ${list.length} faturas`});
      }
    }
    for(const p of (data.patrimonio||[])){
      if(p.classe==='Passivo'&&p.financiamento){const st=Engine.financingState(p);if(!st)errors.push(`Financiamento ${p.id}: estado inválido`);if(st&&st.saldo>0&&st.juros===Infinity)warnings.push(`Financiamento ${p.nome}: parcela não amortiza o principal.`);}
      if(p.classe==='Ativo'&&String(p.categoria||'').toLocaleLowerCase('pt-BR').includes('imó')&&(p.liquidez==='100%'||p.liquidez==='Alta'))errors.push(`Imóvel ${p.nome}: liquidez incompatível.`);
    }
    const cards=new Set((data.cartoes||[]).map(c=>String(c.id)));
    for(const t of (data.transacoes||[]))if(t.tipo==='despesa'&&t.formaPagto==='Cartão'&&!cards.has(String(t.cartaoId)))errors.push(`Transação ${t.id}: cartão inexistente.`);
    if(duplicates.length)warnings.push(`${duplicates.length} possível(is) duplicidade(s) de transação encontrada(s).`);
    return {ok:errors.length===0,errors,warnings,invariants:inv,ledgerEntries:Engine.ledger(data).length,duplicates};
  };
  Engine.masterScenario=function(){
    const d={transacoes:[],orcamento:{},orcamentoControle:{},patrimonio:[],cartoes:[],metas:[],pagamentosFatura:[]};
    const imovel={id:'im1',nome:'Imóvel quitado',classe:'Ativo',categoria:'Imóveis',valor:600000,valorAtual:600000,valorAquisicao:500000,liquidez:'Sem liquidez',investivel:false};
    const fin={id:'fin1',nome:'Financiamento',classe:'Passivo',categoria:'Financiamentos',valor:400000,valorAtual:400000,liquidez:'N/A',financiamento:{valorBem:600000,entrada:200000,valorFinanciado:400000,saldoDevedor:400000,taxaJurosAnual:10,taxaJurosTipo:'efetiva_anual',sistemaAmortizacao:'price',parcelasTotal:240,parcelasPagas:0,parcelaMensal:3500}};
    d.patrimonio.push(imovel,fin); d.cartoes.push({id:'c1',nome:'Teste',limite:10000,fechamento:10,vencimento:17,compromissosFuturos:[]});
    d.transacoes.push({id:'t1',tipo:'receita',valorTotal:10000,valorParcela:10000,dataCompra:'2026-08-01',status:'Realizada',cashImpact:10000});
    d.transacoes.push({id:'t2',tipo:'despesa',valorTotal:1000,valorParcela:1000,formaPagto:'Cartão',cartaoId:'c1',dataCompra:'2026-08-02',status:'Realizada',cashImpact:0});
    d.transacoes.push({id:'t3',tipo:'investimento',valorTotal:2000,valorParcela:2000,patrimonioId:'im1',dataCompra:'2026-08-03',status:'Realizada',cashImpact:-2000});
    return Engine.audit(d);
  };


  Engine.money=function(v){return Math.round((Number(v)||0)*100)/100;};
  Engine.sameMoney=function(a,b,eps=0.005){return Math.abs((Number(a)||0)-(Number(b)||0))<eps;};
  Engine.operationKey=function(t){return [t?.tipo||'',t?.dataCompra||'',t?.faturaMes||'',t?.financiamentoId||'',t?.cartaoId||'',t?.metaId||'',Engine.money(t?.valorParcela??t?.valorTotal),String(t?.descricao||'').trim().toLowerCase()].join('|');};
  Engine.duplicateOperations=function(data){
    const map=new Map(),out=[];
    for(const t of (data.transacoes||[])){
      if(!t||t.status==='Cancelada')continue;
      if(t.recurrenceId||t.installmentId||t.invoiceId||t.operacaoId)continue;
      const key=Engine.operationKey(t);
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(t);
    }
    for(const [key,list] of map){
      if(list.length>1)out.push({key,ids:list.map(x=>String(x.id)),count:list.length,severity:'warning',confidence:Math.min(.9,.5+.1*(list.length-2))});
    }
    return out;
  };
  Engine.edgeCases=function(data){const errors=[],warnings=[];for(const t of (data.transacoes||[])){const v=Number(t.valorParcela??t.valorTotal);if(!Number.isFinite(v)||v<0)errors.push(`Transação ${t.id}: valor inválido`);if(['investimento','resgate','amortizacao'].includes(t.tipo)&&v===0)warnings.push(`Transação ${t.id}: operação financeira com valor zero.`);if(t.tipo==='amortizacao'&&v>0&&!t.financiamentoId)errors.push(`Amortização ${t.id}: financiamento ausente`);}for(const c of (data.cartoes||[])){if(Number(c.limite)<0)errors.push(`Cartão ${c.id}: limite negativo`);if(Number(c.fechamento)<1||Number(c.fechamento)>31)warnings.push(`Cartão ${c.id}: fechamento fora do intervalo usual.`);}for(const p of (data.patrimonio||[])){const v=Number(p.valorAtual??p.valor);if(!Number.isFinite(v))errors.push(`Patrimônio ${p.id}: valor inválido`);if(p.classe==='Passivo'&&p.financiamento&&Number(p.financiamento.saldoDevedor)<0)errors.push(`Financiamento ${p.id}: saldo devedor negativo`);}return {ok:errors.length===0,errors,warnings};};

  Engine.validate=function(data){
    const errors=[],warnings=[];
    const ids=new Map();
    for(const [name,arr] of Object.entries({transacoes:data.transacoes||[],patrimonio:data.patrimonio||[],cartoes:data.cartoes||[],metas:data.metas||[]})){
      for(const x of arr){if(x?.id==null)errors.push(`${name}: registro sem id`); const k=String(x?.id); if(ids.has(`${name}:${k}`))errors.push(`${name}: id duplicado ${k}`); ids.set(`${name}:${k}`,1);}
    }
    const cards=new Set((data.cartoes||[]).map(c=>String(c.id)));
    const pats=new Set((data.patrimonio||[]).map(p=>String(p.id)));
    const metas=new Set((data.metas||[]).map(m=>String(m.id)));
    for(const t of (data.transacoes||[])){
      if(t.tipo==='despesa'&&t.formaPagto==='Cartão'&&!cards.has(String(t.cartaoId)))errors.push(`transação ${t.id}: cartão inválido`);
      if(t.tipo==='investimento'&&!pats.has(String(t.patrimonioId)))errors.push(`investimento ${t.id}: ativo patrimonial ausente`);if(t.tipo==='resgate'&&(!pats.has(String(t.patrimonioId))||Number(t.valorTotal||0)<=0))errors.push(`resgate ${t.id}: investimento ou valor inválido`);
      if(t.metaId&&!metas.has(String(t.metaId)))errors.push(`transação ${t.id}: meta inexistente`);
    }
    for(const p of (data.patrimonio||[])){
      if(p.classe==='Passivo'&&p.financiamento){const f=p.financiamento;if(Number(f.taxaJurosAnual)<0)errors.push(`financiamento ${p.id}: taxa inválida`);if(Number(f.parcelaMensal)<0)errors.push(`financiamento ${p.id}: parcela inválida`);if(f.taxaJurosTipo!=='efetiva_anual')warnings.push(`financiamento ${p.id}: taxa marcada como não efetiva; normalizando como efetiva anual`);if(!['sac','price'].includes(String(f.sistemaAmortizacao||'price').toLowerCase()))warnings.push(`financiamento ${p.id}: sistema de amortização não reconhecido; usando Price`);}
    }
    for(const t of (data.transacoes||[])){if(t.tipo==='amortizacao'&&!t.financiamentoId)errors.push(`amortização ${t.id}: financiamento ausente`);if(t.tipo==='amortizacao'&&Number(t.valorTotal||0)<=0)errors.push(`amortização ${t.id}: valor inválido`);}
    if((data.schemaVersion||0)<20)warnings.push('schemaVersion anterior ao Financial Core 4.6.2; migração recomendada');
    const edge=Engine.edgeCases(data); errors.push(...edge.errors); warnings.push(...edge.warnings);
    const duplicateOps=Engine.duplicateOperations(data); if(duplicateOps.length)warnings.push(`${duplicateOps.length} operação(ões) potencialmente repetida(s); confirme antes de excluir.`);
    const fatalErrors=errors.filter(e=>/valor inválido|saldo devedor negativo|cartão inválido|financiamento ausente|ativo patrimonial ausente|meta inexistente/.test(e));
    return {ok:errors.length===0,fatal:fatalErrors.length>0,errors,warnings,duplicateOperations:duplicateOps};
  };

  Engine.invariants=function(data){
    const d=data||{}, checks=[], n=v=>Number.isFinite(Number(v))?Number(v):0;
    const eq=(a,b,eps=.01)=>Math.abs(n(a)-n(b))<=eps;
    const assets=(d.patrimonio||[]).filter(p=>p&&p.classe==='Ativo');
    const liabilities=(d.patrimonio||[]).filter(p=>p&&p.classe==='Passivo');
    const value=p=>n(p.valorAtual??p.valor??p.saldo);
    const gross=assets.reduce((a,p)=>a+Math.max(0,value(p)),0);
    const debt=liabilities.reduce((a,p)=>a+Math.max(0,n(p.financiamento?.saldoDevedor??p.valor)),0);
    const net=gross-debt;
    const nw=Engine.netWorth(d);

    checks.push({id:'net-worth-equation',name:'Patrimônio líquido = ativos - passivos',
      ok:eq(nw.bruto,gross)&&eq(nw.dividas,debt)&&eq(nw.liquido,net),
      expected:{bruto:gross,dividas:debt,liquido:net},
      actual:{bruto:nw.bruto,dividas:nw.dividas,liquido:nw.liquido}});

    const liquidExpected=assets.filter(p=>{
      const cat=String(p.categoria||'').toLowerCase();
      if(/im[oó]vel|terreno|ve[ií]culo/.test(cat)) return false;
      return ['100%','Alta','D+0','D+1'].includes(String(p.liquidez||''));
    }).reduce((a,p)=>a+Math.max(0,value(p)),0);
    const liquidActual=Engine.liquidAssets(d);

    checks.push({id:'liquid-assets',name:'Ativos líquidos = soma dos ativos elegíveis',
      ok:eq(liquidActual,liquidExpected),expected:liquidExpected,actual:liquidActual});

    const reserveExpected=assets.filter(p=>p.reservaEmergencia===true ||
      String(p.categoria||'').toLowerCase().includes('reserva de emergência'))
      .reduce((a,p)=>a+Math.max(0,value(p)),0);
    const reserveActual=Engine.emergencyReserve(d);

    checks.push({id:'emergency-reserve',name:'Reserva = soma dos ativos marcados como reserva',
      ok:eq(reserveActual,reserveExpected),expected:reserveExpected,actual:reserveActual});

    // A goal is a purpose/reference, never a second patrimonial asset.
    const goalLinkedAssets=assets.filter(p=>p.metaId||p.destino==='meta'||p.finalidade==='meta');
    const goalSum=goalLinkedAssets.reduce((a,p)=>a+Math.max(0,value(p)),0);
    checks.push({id:'goals-no-double-count',name:'Metas não duplicam patrimônio',
      ok:goalSum<=gross+.01,expected:`<= ${gross}`,actual:goalSum});

    const cardPaymentExpense=(d.transacoes||[]).some(t=>{
      const type=String(t.tipo||'').toLowerCase();
      return ['pagamento_cartao','pagamento_fatura','pagamento-fatura'].includes(type) &&
        String(t.categoria||'').toLowerCase()!=='cartão de crédito';
    });
    checks.push({id:'card-payment-not-expense',name:'Pagamento de cartão não é despesa',ok:!cardPaymentExpense});

    const invalidTransfer=(d.transacoes||[]).some(t=>{
      const type=String(t.tipo||'').toLowerCase();
      return type==='transferencia' && Math.abs(n(t.impactoResultado||t.resultImpact||0))>.01;
    });
    checks.push({id:'transfer-not-result',name:'Transferência não altera resultado',ok:!invalidTransfer});

    return checks;
  };
  window.FinancialEngine=Engine;
})();
