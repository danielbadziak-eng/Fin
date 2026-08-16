/* FinançasPRO 4.6.2 — CORE HARDENING */
const FINPRO_CORE_VERSION='5.0.0';
const STORAGE_KEY='financas_pro_data_v2';
const THEME_KEY='financas_pro_theme';
const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ===== CORE STABILIZATION: STATE INVARIANTS ===== */

/* ===== CORE HARDENING POLICIES ===== */
const FIN_MONEY_POLICY=Object.freeze({precision:2,epsilon:0.005});
/* ===== GLOBAL TOAST 4.6.2 ===== */
function finToast(message,type='success',duration=2800){
  let root=document.getElementById('fin-toast-root');
  if(!root){
    root=document.createElement('div');
    root.id='fin-toast-root';
    root.setAttribute('aria-live','polite');
    root.setAttribute('aria-atomic','true');
    document.body.appendChild(root);
  }
  const el=document.createElement('div');
  el.className=`fin-toast fin-toast-${type}`;
  el.textContent=String(message||'Concluído.');
  root.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  const close=()=>{
    el.classList.remove('show');
    setTimeout(()=>el.remove(),220);
  };
  setTimeout(close,Math.max(1200,duration));
  return {close};
}
function finToastSuccess(message){return finToast(message,'success');}
function finToastError(message){return finToast(message,'error',3600);}
function finToastInfo(message){return finToast(message,'info');}

function finMoney(v){return Math.round((Number(v)||0)*100)/100;}

/* ===== CORE STABILIZATION: DATA MIGRATION 4.6 ===== */
const FINPRO_SCHEMA_VERSION='5.0.0';
const FINPRO_SCHEMA_NUMBER=22;
function finApplySchemaMigrations(data){
  const d=data||{}; let v=Number(d.schemaVersion)||0;
  if(v<19){ if(!Array.isArray(d.finInsightsLog))d.finInsightsLog=[]; if(Array.isArray(d.finJourneys)){const map={};d.finJourneys.forEach((j,i)=>{if(j&&typeof j==='object'){const id=j.id||j.ruleId||('legacy-'+i);map[id]={...j,id};}});d.finJourneys=map;} else if(!d.finJourneys||typeof d.finJourneys!=='object')d.finJourneys={}; if(!Array.isArray(d.finOutcomeMemory))d.finOutcomeMemory=[]; v=19; }
  if(v<20){ d.finConfig={reservaMeses:6,desvioCategoriaPct:30,comprometimentoCartaoPct:30,...(d.finConfig||{})}; d.finOutcomePolicy={minDaysBeforeVerdict:7,...(d.finOutcomePolicy||{})}; v=20; }
  if(v<21){d.finOutcomePolicy={...FIN_OUTCOME_POLICY,...(d.finOutcomePolicy||{})};v=21;}
  if(v<22){d.finOutcomePolicy={...FIN_OUTCOME_POLICY,...(d.finOutcomePolicy||{})};v=22;}
  d.schemaVersion=FINPRO_SCHEMA_NUMBER; d.schemaVersionLabel=FINPRO_SCHEMA_VERSION; return d;
}

function finCoreNumber(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function finCoreNonNegative(v){return Math.max(0,finCoreNumber(v));}
function finCoreValidateState(data){
  const d=data||{};
  const errors=[], warnings=[];
  if(Array.isArray(d.transacoes)){
    const seen=new Set();
    d.transacoes.forEach((x,i)=>{
      const id=String(x.id||'');
      if(id && seen.has(id)) errors.push({type:'duplicate_transaction_id',index:i,id});
      if(id) seen.add(id);
      if(Number(x.valor)<0 && x.tipo!=='transferencia') warnings.push({type:'negative_transaction',index:i});
    });
  }
  if(Array.isArray(d.finOutcomeMemory)){
    d.finOutcomeMemory.forEach((x,i)=>{
      if(!x.ruleId) warnings.push({type:'outcome_without_rule',index:i});
      if(x.snapshotBefore && x.snapshotAfter && x.snapshotBefore===x.snapshotAfter)
        warnings.push({type:'identical_outcome_snapshots',index:i});
    });
  }
  return {ok:errors.length===0,errors,warnings};
}
function finCoreAuditState(){
  try{
    const result=finCoreValidateState(typeof appData!=='undefined'?appData:{});
    return result;
  }catch(err){
    return {ok:false,errors:[{type:'audit_exception',message:String(err?.message||err)}],warnings:[]};
  }
}

function applyTheme(name){
  if(!['dark','light'].includes(name)) name='dark';
  document.documentElement.setAttribute('data-theme',name);
  localStorage.setItem(THEME_KEY,name);
  if($('themeSelect')) $('themeSelect').value=name;
  if(document.readyState!=='loading') refreshAll();
}
function initTheme(){
  const raw=localStorage.getItem(THEME_KEY)||'dark';
  const saved=['dark','light'].includes(raw)?raw:'dark';
  document.documentElement.setAttribute('data-theme',saved);
  if($('themeSelect')) $('themeSelect').value=saved;
}
let chartDashboardFinanceTrendInstance=null;
const $=id=>document.getElementById(id);
const brl=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function escapeHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}

const hoje=()=>new Date();
const pad=n=>String(n).padStart(2,'0');
const novoId=()=>`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const monthKey=(y,m)=>`${y}-${pad(m)}`;
const parseDate=s=>{if(!s)return null; const [y,m,d]=String(s).split('-').map(Number); if(!y||!m||!d)return null; return new Date(y,m-1,d)};
const monthToDate=s=>{const [y,m]=String(s||'').split('-').map(Number);return y&&m?`${y}-${pad(m)}-01`:iso(hoje())};
const dateToMonth=s=>{const d=parseDate(s);return d?monthKey(d.getFullYear(),d.getMonth()+1):monthKey(hoje().getFullYear(),hoje().getMonth()+1)};

let appData={transacoes:[],orcamento:{Moradia:6000,'Alimentação':2000,Transporte:1500,Lazer:1000},orcamentoControle:{},categorias:[],patrimonio:[],cartoes:[],metas:[],snapshotsPatrimonio:[],metaEconomia:30,limiteComprometimentoCartao:30,pagamentosFatura:[],finConfig:{reservaMeses:6,desvioCategoriaPct:30,comprometimentoCartaoPct:30},finInsightsLog:[],finJourneys:{},finOutcomeMemory:[],schemaVersion:22};
let chartGastosInstance=null,chartExtratoInstance=null,chartDashboardCategoriasInstance=null,chartPatrimonioLiquidoInstance=null,chartPatrimonioAtivosInstance=null,chartPatrimonioPassivosInstance=null;
let scoreDetalhes={total:0,valores:[],status:'',pilares:[]};
let metaPrazoTargetId=null;
let selectedDashboardMonth=monthKey(hoje().getFullYear(),hoje().getMonth()+1);
let simSubTabAtual='gastos';
function daysInMonth(y,m){return new Date(y,m,0).getDate()}
function addMonthsSafe(date,n){const d=new Date(date); const day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n); d.setDate(Math.min(day,daysInMonth(d.getFullYear(),d.getMonth()+1))); return d}
function monthLabel(y,m){return new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','')}
function currentYM(){const d=hoje();return {year:d.getFullYear(),month:d.getMonth()+1}}
let refreshTimer=null;
let isRendering=false;
let isInitialized=false;

function requestRefresh(reason='state-change'){
  if(document.readyState==='loading' || !isInitialized || isRendering) return;
  if(refreshTimer) clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{
    refreshTimer=null;
    refreshAll(reason);
  },0);
}

function saveData(options={}){
  const shouldRefresh=options.refresh!==false;
  finApplySchemaMigrations(appData);
  if(window.FinancialEngine){
    FinancialEngine.reconcileGoals(appData);
    const check=FinancialEngine.validate(appData);
    if(!check.ok) console.warn('[FinançasPRO] Integridade:',check.errors);
    if(check.fatal) throw new Error('Dados financeiros inválidos: '+check.errors.join(' | '));
  }
  localStorage.setItem(STORAGE_KEY,JSON.stringify(appData));
  if(options.successMessage) finToastSuccess(options.successMessage);
  if(shouldRefresh) requestRefresh('persist');
}
function seedData(){
  const now=hoje(), y=now.getFullYear(), m=now.getMonth()+1;
  appData.transacoes=[
    {id:101,descricao:'Salário',valorTotal:21822,valorParcela:21822,tipo:'receita',categoria:'Renda Principal',formaPagto:'Conta',parcelas:1,parcelaAtual:1,dataCompra:iso(new Date(y,m-1,1)),status:'Realizada'},
    {id:102,descricao:'Aluguel',valorTotal:5780,valorParcela:5780,tipo:'despesa',categoria:'Moradia',formaPagto:'Conta',parcelas:1,parcelaAtual:1,dataCompra:iso(new Date(y,m-1,5)),status:'Realizada'},
    {id:103,descricao:'Supermercado',valorTotal:2530,valorParcela:2530,tipo:'despesa',categoria:'Alimentação',formaPagto:'Cartão',cartaoNome:'Cartão Black',parcelas:1,parcelaAtual:1,dataCompra:iso(new Date(y,m-1,8)),status:'Realizada'},
    {id:104,descricao:'Aporte Renda Fixa',valorTotal:3749,valorParcela:3749,tipo:'investimento',categoria:'Investimentos',formaPagto:'Conta',parcelas:1,parcelaAtual:1,dataCompra:iso(new Date(y,m-1,8)),status:'Realizada'}
  ];
  appData.patrimonio=[
    {id:1,nome:'Conta Corrente',classe:'Ativo',categoria:'Dinheiro em conta',valor:25000,liquidez:'100%'},
    {id:2,nome:'Reserva de Emergência',classe:'Ativo',categoria:'Reserva de emergência',valor:150000,liquidez:'100%'},
    {id:3,nome:'CDB Liquidez Diária',classe:'Ativo',categoria:'Renda fixa',valor:75000,liquidez:'100%'},
    {id:4,nome:'Imóvel Residencial',classe:'Ativo',categoria:'Imóveis',valor:600000,liquidez:'Baixa'},
    {id:5,nome:'Financiamento Imobiliário',classe:'Passivo',categoria:'Financiamentos',valor:180000,liquidez:'N/A'}
  ];
  appData.cartoes=[{id:1,nome:'Cartão Black',limite:40000,fechamento:10,vencimento:17}];
  appData.metas=[{id:1,nome:'Viagem Europa',acumulado:35000,objetivo:50000,inicio:`${y}-01-01`,prazo:`${y}-12-31`}];
}
function migrateData(){
  // Migração determinística: a chave atual é sempre a fonte principal.
  // Bases legadas só são usadas quando a chave atual não existe.
  const legacyKeys=['financas_pro_data','financas_pro_data_v1','financas_pro_data_v3','financaspro_data'];
  let source=null, sourceKey=null;
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw){const obj=JSON.parse(raw);if(obj&&typeof obj==='object'){source=obj;sourceKey=STORAGE_KEY;}}
  }catch(e){console.warn('[FinançasPRO] Base atual inválida. Será tentada uma base legada.',e)}
  if(!source){
    for(const key of legacyKeys){
      try{const raw=localStorage.getItem(key);if(!raw)continue;const obj=JSON.parse(raw);if(obj&&typeof obj==='object'){source=obj;sourceKey=key;break;}}catch(e){console.warn('[FinançasPRO] Backup legado ignorado:',key,e)}
    }
  }
  if(source){
    appData={...appData,...source};
    console.info('[FinançasPRO] Dados carregados de',sourceKey);
  } else {
    // Primeira execução: mantém o seed original para experiência de demonstração.
    seedData();
  }
  finApplySchemaMigrations(appData);
  normalizeData();
  finApplySchemaMigrations(appData);
  saveData();
  // Não cria/reescreve snapshot automaticamente de um estado inválido ou vazio.
  if((appData.patrimonio||[]).length) snapshotPatrimonioMensal();
}
function ensureUniqueIds(arr){
  const used=new Set();
  return (Array.isArray(arr)?arr:[]).map(item=>{
    let id=item?.id;
    if(id==null||used.has(String(id))) id=`id-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    used.add(String(id));
    return {...item,id};
  });
}
function normalizeData(){
  appData.transacoes=ensureUniqueIds(appData.transacoes).map(t=>{const estado=t.estadoOperacao||(t.status==='Cancelada'?'cancelada':t.status==='Prevista'?'prevista':'realizada');return {...t,status:t.status||'Realizada',estadoOperacao:estado,parcelas:Number(t.parcelas)||1,parcelaAtual:Number(t.parcelaAtual)||1,valorParcela:Number(t.valorParcela)||Number(t.valorTotal)||0,cartaoId:t.cartaoId??null,invoiceId:t.invoiceId??(t.faturaMes&&t.cartaoId?invoiceId(t.cartaoId,t.faturaMes):null),isFaturaCartao:t.isFaturaCartao===true,faturaMes:t.faturaMes??null,reservaEmergencia:t.reservaEmergencia===true,processadaFinanceiramente:t.processadaFinanceiramente===true,cashImpact:t.cashImpact??null}});
  appData.patrimonio=ensureUniqueIds(appData.patrimonio);
  appData.cartoes=ensureUniqueIds(appData.cartoes);
  appData.metas=ensureUniqueIds(appData.metas);
  appData.snapshotsPatrimonio=Array.isArray(appData.snapshotsPatrimonio)?appData.snapshotsPatrimonio:[];
  appData.orcamento=(appData.orcamento&&typeof appData.orcamento==='object')?appData.orcamento:{};
  appData.orcamentoControle=(appData.orcamentoControle&&typeof appData.orcamentoControle==='object')?appData.orcamentoControle:{};
  appData.categorias=Array.isArray(appData.categorias)?appData.categorias:[];
  appData.pagamentosFatura=Array.isArray(appData.pagamentosFatura)?appData.pagamentosFatura:[];
  appData.finConfig={reservaMeses:6,desvioCategoriaPct:30,comprometimentoCartaoPct:30,...(appData.finConfig||{})};
  appData.finInsightsLog=Array.isArray(appData.finInsightsLog)?appData.finInsightsLog:[];
  appData.finInsightsLog=appData.finInsightsLog.slice(-300);
  appData.finJourneys=(appData.finJourneys&&typeof appData.finJourneys==='object')?appData.finJourneys:{};
  appData.finOutcomeMemory=Array.isArray(appData.finOutcomeMemory)?appData.finOutcomeMemory:[];
  appData.finOutcomeMemory=appData.finOutcomeMemory.slice(-200);
  appData.finOutcomePolicy={...FIN_OUTCOME_POLICY,...(appData.finOutcomePolicy||{})};
  appData.finOutcomePolicy.minDaysBeforeVerdict=Math.max(0,Number(appData.finOutcomePolicy.minDaysBeforeVerdict)||FIN_OUTCOME_POLICY.minDaysBeforeVerdict);
  appData.schemaVersion=FINPRO_SCHEMA_NUMBER;
  appData.schemaVersionLabel=FINPRO_SCHEMA_VERSION;

  const categoriaMap=new Map();
  const addCategoria=raw=>{const nome=String(raw??'').trim();if(!nome)return;const key=nome.toLocaleLowerCase('pt-BR');if(!categoriaMap.has(key))categoriaMap.set(key,nome)};
  Object.keys(appData.orcamento).forEach(addCategoria);
  appData.categorias.forEach(addCategoria);
  appData.transacoes.forEach(t=>addCategoria(t.categoria));
  categoriaMap.forEach((nome,key)=>{if(!Object.keys(appData.orcamento).some(c=>c.toLocaleLowerCase('pt-BR')===key))appData.orcamento[nome]=0});
  // Categoria estrutural do cartão: compras novas são lançadas como 'Cartão de Crédito'
  // e o cartão específico é escolhido no próprio lançamento.
  if(!Object.keys(appData.orcamento).some(c=>isCategoriaCartaoCredito(c))) appData.orcamento['Cartão de Crédito']=0;
  addCategoria('Cartão de Crédito');
  appData.categorias=[...categoriaMap.values()];

  appData.metaEconomia=Number(appData.metaEconomia??30);
  appData.limiteComprometimentoCartao=Math.max(1,Math.min(100,Number(appData.limiteComprometimentoCartao??30)||30));
  appData.cartoes=appData.cartoes.map(c=>({...c,compromissosFuturos:Array.isArray(c.compromissosFuturos)?c.compromissosFuturos:[]}));
  appData.transacoes.forEach(t=>{
    if(!t.cartaoId&&t.cartaoNome){const c=appData.cartoes.find(c=>c.nome===t.cartaoNome);if(c)t.cartaoId=c.id}
    if(t.cashImpact===null)t.cashImpact=t.isFaturaCartao?0:t.tipo==='receita'?Number(t.valorParcela||t.valorTotal||0):t.tipo==='despesa'||t.tipo==='investimento'? -Number(t.valorParcela||t.valorTotal||0):t.tipo==='resgate'?Number(t.valorLiquidoResgate||t.valorParcela||t.valorTotal||0):t.tipo==='pagamento_cartao'? -Number(t.valorParcela||t.valorTotal||0):0;
  });
  appData.patrimonio=appData.patrimonio.map(p=>{
    const classeRaw=String(p.classe||'Ativo').trim().toLowerCase();
    const classe=classeRaw==='passivo'?'Passivo':'Ativo';
    const categoria=String(p.categoria||'Outros').trim()||'Outros';
    const catLower=categoria.toLocaleLowerCase('pt-BR');
    const isImovel=classe==='Ativo' && (catLower.includes('imóvel') || catLower.includes('imovel') || catLower.includes('imoveis') || catLower.includes('imóveis'));
    const investivel=isImovel?false:(p.investivel===true || ['renda fixa','reserva de emergência','ações','fiis','criptoativos','investimentos','investimento','cdb','lci','lca','tesouro','fundo','fundos','previdência','previdencia','cripto','bitcoin'].some(k=>catLower.includes(k)||String(p.nome||'').toLocaleLowerCase('pt-BR').includes(k)));
    const financiamento=p.financiamento?{...p.financiamento,taxaJurosTipo:'efetiva_anual',sistemaAmortizacao:['sac','price'].includes(String(p.financiamento.sistemaAmortizacao||'').toLowerCase())?String(p.financiamento.sistemaAmortizacao).toLowerCase():'price'}:null;
    const valorFinanciamento=financiamento?Math.max(0,Number(financiamento.saldoDevedor ?? financiamento.valorFinanciado ?? p.valor ?? 0)||0):0;
    const valorAtual=financiamento?valorFinanciamento:(Number(p.valorAtual ?? p.valor ?? 0)||0);
    const valorAquisicao=Number(p.valorAquisicao ?? (isImovel?valorAtual:0))||0;
    return {...p,classe,categoria,nome:String(p.nome||'Item').trim()||'Item',valor:valorAtual,valorAtual,valorAquisicao,geraRenda:Boolean(p.geraRenda),rendaMensal:Number(p.rendaMensal)||0,liquidez:isImovel?'Sem liquidez':(p.liquidez||'100%'),rentabilidadeAnual:isImovel?0:(Number(p.rentabilidadeAnual)||0),indexador:p.indexador||'prefixado',dataAplicacao:p.dataAplicacao||null,vencimento:p.vencimento||null,financiamento,investivel:Boolean(investivel),regimeTributario:p.regimeTributario||'outro'};
  });
  // Evita dupla contagem das metas: o saldo inicial é somente o que existia antes
  // dos aportes já vinculados às transações desta meta.
  appData.metas=appData.metas.map(m=>{
    const linked=(appData.transacoes||[]).filter(t=>t.status!=='Cancelada'&&String(t.metaId)===String(m.id)&&['investimento','poupanca'].includes(t.tipo)).reduce((s,t)=>s+Number(t.valorParcela||t.valorTotal||0),0);
    const saldoInicial=m.saldoInicial!=null?Number(m.saldoInicial)||0:Math.max(0,(Number(m.acumulado)||0)-linked);
    return {...m,saldoInicial,acumulado:Math.max(0,saldoInicial+linked),frase:m.frase||''};
  });
  if(window.FinancialEngine) FinancialEngine.reconcileGoals(appData);
}
function getMonthTransactions(y,m){return appData.transacoes.filter(t=>{const d=parseDate(t.dataCompra);return d&&d.getFullYear()===y&&d.getMonth()+1===m&&t.status!=='Cancelada'})}
function transactionAmount(t){return Number(t.valorParcela||t.valorTotal||0)}
function transactionCashImpact(t){if(t.cashImpact!==null&&t.cashImpact!==undefined)return Number(t.cashImpact)||0;if(t.tipo==='receita')return transactionAmount(t);if(t.tipo==='despesa'||t.tipo==='investimento')return -transactionAmount(t);if(t.tipo==='resgate')return Number(t.valorLiquidoResgate||transactionAmount(t));if(t.tipo==='pagamento_cartao')return -transactionAmount(t);return 0}
function calculateMonthlyTotals(y,m){return window.FinancialEngine?FinancialEngine.monthlyTotals(appData,y,m):{receitas:0,despesas:0,investimentos:0,transferencias:0,pagamentosCartao:0,resultado:0,taxaEconomia:0,fluxoCaixa:0,fluxoLivre:0}}
function calculateNetWorth(){return window.FinancialEngine?FinancialEngine.netWorth(appData):{bruto:0,dividas:0,liquido:0}}
function calculateInvestableAssets(){return window.FinancialEngine?FinancialEngine.investable(appData):0}
function calculateLiquidAssets(){return window.FinancialEngine?FinancialEngine.liquid(appData):0}
function calculateEmergencyReserve(){return window.FinancialEngine?FinancialEngine.emergency(appData):0}
function avgExpenses(months=6){
  let s=0,count=0;
  for(let i=0;i<months;i++){
    const d=addMonthsSafe(hoje(),-i),tot=calculateMonthlyTotals(d.getFullYear(),d.getMonth()+1);
    if(tot.despesas>0){s+=tot.despesas;count++;}
  }
  if(!count){const cur=calculateMonthlyTotals(currentYM().year,currentYM().month);const planned=getBudgetTotal();return {media:Math.max(cur.despesas,planned),meses:0};}
  return {media:s/count,meses:count};
}
function calculateReserveCoverage(){const base=Math.max(0,avgExpenses(6).media);return base?calculateEmergencyReserve()/base:0}
function snapshotPatrimonioMensal(force=false){
  const {year,month}=currentYM(), key=monthKey(year,month), nw=calculateNetWorth();
  const existing=appData.snapshotsPatrimonio.find(s=>s.mes===key);
  const snap={mes:key,data:iso(hoje()),bruto:nw.bruto,dividas:nw.dividas,liquido:nw.liquido,investivel:calculateInvestableAssets(),liquidos:calculateLiquidAssets(),fechado:existing?.fechado===true&&!force};
  if(existing&&existing.fechado&&!force)return;
  if(existing)Object.assign(existing,snap);else appData.snapshotsPatrimonio.push(snap);
  appData.snapshotsPatrimonio=appData.snapshotsPatrimonio.slice(-36);saveData();
}
function fecharSnapshotMes(y=dashboardYM().year,m=dashboardYM().month){const key=monthKey(y,m);const s=appData.snapshotsPatrimonio.find(x=>x.mes===key);if(s){s.fechado=true;saveData();return}const nw=calculateNetWorth();appData.snapshotsPatrimonio.push({mes:key,data:iso(hoje()),bruto:nw.bruto,dividas:nw.dividas,liquido:nw.liquido,investivel:calculateInvestableAssets(),liquidos:calculateLiquidAssets(),fechado:true});saveData()}

function pctChange(a,b){return b?((a-b)/b)*100:null}
function dashboardYM(){const [y,m]=(selectedDashboardMonth||monthKey(hoje().getFullYear(),hoje().getMonth()+1)).split('-').map(Number);return {year:y,month:m}}
function setDashboardMes(value){if(!/^\d{4}-\d{2}$/.test(value))return;selectedDashboardMonth=value;localStorage.setItem('financas_pro_dashboard_month',value);atualizarDashboard()}
function ehAtivoInvestimento(p){
  if(window.FinancialEngine?.isInvestmentAsset) return window.FinancialEngine.isInvestmentAsset(p);
  if(!p || p.classe!=='Ativo') return false;
  const cat=String(p.categoria||'').toLocaleLowerCase('pt-BR').trim();
  const nome=String(p.nome||'').toLocaleLowerCase('pt-BR');
  const isImovel=['imóvel','imovel','imoveis','imóveis'].some(k=>cat.includes(k));
  if(isImovel) return false;
  return p.investivel===true || ['renda fixa','reserva de emergência','ações','fiis','criptoativos','investimentos','investimento','cdb','lci','lca','tesouro','fundo','fundos','previdência','previdencia','cripto','bitcoin'].some(k=>cat.includes(k)||nome.includes(k));
}
function chartPalette(labels){
  const palette=['#22c55e','#3b82f6','#a855f7','#f59e0b','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#8b5cf6','#14b8a6','#eab308','#f43f5e','#0ea5e9','#d946ef','#65a30d','#fb7185','#0284c7','#c026d3','#ca8a04'];
  return labels.map(label=>{let h=0;for(const ch of String(label))h=(h*31+ch.charCodeAt(0))%palette.length;return palette[h]});
}
function renderizarDistribuicaoDashboard(y,m){
  const canvas=$('chartDashboardCategorias');
  if(!canvas)return;
  if(typeof Chart==='undefined'){canvas.style.display='none';let e=canvas.parentElement.querySelector('.chart-empty');if(!e){e=document.createElement('div');e.className='chart-empty';e.textContent='Gráfico indisponível no modo offline, mas os dados continuam disponíveis.';canvas.parentElement.appendChild(e);}return;}
  if(chartDashboardCategoriasInstance){chartDashboardCategoriasInstance.destroy();chartDashboardCategoriasInstance=null;}
  const grupos=categoriaTotals(y,m), labels=Object.keys(grupos), data=Object.values(grupos);
  if(!labels.length){canvas.style.display='none';let empty=canvas.parentElement.querySelector('.chart-empty');if(!empty){empty=document.createElement('div');empty.className='chart-empty';empty.textContent='Nenhuma despesa registrada no mês selecionado.';canvas.parentElement.appendChild(empty);}return;}
  canvas.style.display='block';const empty=canvas.parentElement.querySelector('.chart-empty');if(empty)empty.remove();
  const colors=chartPalette(labels);
  chartDashboardCategoriasInstance=new Chart(canvas,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderColor:cssVar('--panel'),borderWidth:3,hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:'64%',plugins:{legend:{position:'right',labels:{color:cssVar('--text'),usePointStyle:true,pointStyle:'circle',padding:14,font:{size:11}}},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${brl(ctx.parsed)}`}}}}});
}
function dashboardDecisionStatus(rules,d){
  const danger=rules.find(r=>r.level==='danger'),warning=rules.find(r=>r.level==='warning');
  if(danger)return {type:'danger',icon:'!',title:'Atenção recomendada',text:danger.problema||danger.titulo};
  if(warning)return {type:'warning',icon:'!',title:'Atenção recomendada',text:warning.problema||warning.titulo};
  return {type:'success',icon:'✓',title:'Seu cenário está estável',text:'Os dados atuais não mostram um ponto que exija intervenção imediata.'};
}
function calculateSafeSpending(at,year=dashboardYM().year,month=dashboardYM().month){
  const orçamento=getBudgetFinalPlannedTotal(),realizado=getBudgetRealizedTotal(year,month),margemOrcamento=orçamento>0?Math.max(0,orçamento-realizado):Infinity,fluxoLivre=Number(at?.fluxoLivre||0),pressao=Number(at?.resultado||0)<0||fluxoLivre<0,margemBase=Number.isFinite(margemOrcamento)?Math.min(margemOrcamento,Math.max(0,fluxoLivre)):Math.max(0,fluxoLivre);
  return {valor:pressao?0:margemBase,orçamento,realizado,fluxoLivre,pressao};
}
function dashboardDecisionMessage(r){
  if(!r)return '';
  const levelLabel=r.level==='danger'?'PRIORIDADE ALTA':r.level==='warning'?'PONTO DE ATENÇÃO':'OPORTUNIDADE';
  return `<div class="dashboard-insight-item ${escapeHtml(r.level||'info')}"><div class="dashboard-insight-top"><span class="decision-level">${levelLabel}</span><strong>${escapeHtml(r.titulo||'')}</strong></div><p>${escapeHtml(r.motivo||r.problema||'')}</p><small>${escapeHtml(r.acao||'')}</small><div class="dashboard-insight-actions"><button class="btn-sm" onclick="goToTab('${escapeHtml(r.tab||'dashboard')}')">Ver no módulo</button>${r.id!=='stable'?`<button class="btn-sm" onclick="toggleFIN(true)">Analisar com FIN</button>`:''}</div></div>`;
}
function renderDashboardDecisionCenter(){
  const box=$('dashboard-decision-center');if(!box)return;
  const {year,month}=dashboardYM();
  const at=calculateMonthlyTotals(year,month);
  let decision=null;try{decision=finDecisionForCurrentScenario();}catch(e){decision=null;}
  const mode=decision?.mode||'normal';
  const data=finInsightGlobal();
  const primary=decision?.primary?.mensagem||null;
  const profile=finCharacterProfile(decision?.state||'calm');
  const finTitle=primary?.titulo||profile.label||(mode==='silence'?'Estou acompanhando seu cenário':'Leitura do seu cenário');
  const finText=primary?.problema||primary?.motivo||profile.message||'Estou consolidando seus dados para trazer a leitura mais importante do momento.';
  const anomaly=detectarAnomalias()[0];
  const finAction=primary?.acao|| (anomaly?`Também identifiquei ${anomaly.cat||'uma categoria'} fora do padrão. O FIN pode aprofundar esse ponto.`:(mode==='silence'?'Nenhum ponto atingiu o limiar de relevância agora. O FIN continua acompanhando.':'O FIN explica os motivos e sugere o próximo passo, sem decidir por você.'));
  const fm=$('dashboard-fin-message');
  if(fm){fm.className=`card dashboard-fin-message fin-${escapeHtml(decision?.state||'calm')}`;}
  const ft=$('dashboard-fin-title');if(ft)ft.textContent=finTitle;
  const fx=$('dashboard-fin-text');if(fx)fx.textContent=finText;
  const fa=$('dashboard-fin-action');if(fa)fa.textContent=finAction;
  const fc=$('dashboard-fin-message .fin-character');if(fc)fc.className=`fin-character state-${escapeHtml(decision?.state||'calm')}`;
  const spend=calculateSafeSpending(at,year,month),sv=$('dashboard-spend-value'),sn=$('dashboard-spend-note'),ss=$('dashboard-spend-status');
  if(sv)sv.textContent=brl(spend.valor);
  if(sn)sn.textContent=spend.pressao?'Seu cenário atual pede cautela com novos gastos discricionários.':spend.orçamento>0?`Margem segura considerando orçamento e fluxo livre. Orçamento restante: ${brl(Math.max(0,spend.orçamento-spend.realizado))}.`:'Margem baseada no fluxo livre registrado neste mês.';
  if(ss){ss.textContent=spend.pressao?'Segure novos gastos':'Margem disponível';ss.className=`badge ${spend.pressao?'warn':'good'}`;}
  const f=projectFutureCash(3),items=Array.isArray(f.items)?f.items:[],tl=$('dashboard-forecast-timeline'),firstNegative=items.find(x=>Number(x.saldo)<0),min=items.length?Math.min(...items.map(x=>Number(x.saldo)||0)):Number(f.base)||0,fs=$('dashboard-forecast-status');
  if(fs){fs.textContent=firstNegative?'Atenção no futuro':min<0?'Pressão de caixa':'Caixa projetado positivo';fs.className=`badge ${firstNegative||min<0?'warn':''}`;}
  if(tl)tl.innerHTML=items.length?items.map(x=>{const saldo=Number(x.saldo)||0,cls=saldo<0?'danger':saldo===0?'neutral':'success',details=[x.receitas?`+${brl(x.receitas)} receitas`:'',x.despesas?`-${brl(x.despesas)} despesas`:'',x.pagamentos?`-${brl(x.pagamentos)} fatura`:'',x.amortizacoes?`-${brl(x.amortizacoes)} amortização`:'',x.investimentos?`-${brl(x.investimentos)} aportes`:'',x.resgates?`+${brl(x.resgates)} resgates`:'',x.rendimentos?`+${brl(x.rendimentos)} rendimentos`:'' ].filter(Boolean).join(' · ');return `<div class="dashboard-forecast-point ${cls}"><span>${escapeHtml(x.label||'Mês')}</span><strong>${brl(saldo)}</strong><small>${details||'Sem movimentos relevantes'}</small></div>`;}).join(''):`<div class="dashboard-insight-empty"><strong>Sem projeção suficiente.</strong><p>Cadastre receitas, despesas, faturas ou investimentos para projetar os próximos meses.</p></div>`;
  const inv=$('dashboard-forecast-investment-summary');if(inv)inv.innerHTML=`<div><span>Rendimentos estimados · 90 dias</span><strong>${brl(f.totalRendimento||0)}</strong></div><div><span>Investimentos projetados</span><strong>${brl(f.investimentoProjetado||0)}</strong></div><div><span>Resgates previstos</span><strong>${brl(f.totalResgates||0)}</strong></div>`;
  const msg=$('dashboard-forecast-message');if(msg){const rt=f.totalRendimento>0?` Incluindo aproximadamente <b>${brl(f.totalRendimento)}</b> de rendimentos projetados.`:'';msg.className=`dashboard-forecast-message ${min<0?'danger':'success'}`;msg.innerHTML=firstNegative?`<strong>O que isso significa:</strong> o caixa projetado entra no negativo em <b>${escapeHtml(firstNegative.label)}</b>. Vale revisar o cenário antes desse período.${rt}`:min<0?`<strong>O que isso significa:</strong> existe pressão no caixa no cenário projetado. Compare alternativas antes de assumir novos compromissos.${rt}`:`<strong>O que isso significa:</strong> não há déficit projetado nos próximos 90 dias com os dados conhecidos.${rt} A projeção considera aportes e resgates futuros, então retiradas também reduzem o rendimento esperado dos meses seguintes.`;}
}

function dashboardCardSummary(year,month){
 const cards=Array.isArray(appData.cartoes)?appData.cartoes:[], key=monthKey(year,month);
 const rows=[];
 cards.forEach(c=>{
   const total=Math.max(0,cardInvoiceTotal(c,key)-cardInvoicePaid(c,key));
   if(total>0) rows.push({card:c,total,vencimento:Number(c.vencimento)||1,fechamento:Number(c.fechamento)||1});
 });
 rows.sort((a,b)=>a.vencimento-b.vencimento||b.total-a.total);
 let best=null;
 rows.forEach(r=>{
   const day=Math.min(31,Math.max(1,r.vencimento));
   const base=new Date(year,month-1,day); const now=new Date();
   let due=base;
   if(due<new Date(now.getFullYear(),now.getMonth(),now.getDate())) due=new Date(year,month,day);
   if(due<now) due=new Date(year,month+1,day);
   const days=Math.ceil((due-now)/(86400000));
   r.due=due;r.days=days;
   if(!best||days<best.days||days===best.days&&r.total>best.total)best=r;
 });
 return {rows,best,total:rows.reduce((s,r)=>s+r.total,0)};
}
function renderDashboardExecutiveExtras(year,month,at,cobertura){
 const score=document.getElementById('kpi-dashboard-score');
 if(score){score.textContent=(scoreDetalhes.total||0)+'/100';}
 const scoreNote=document.getElementById('kpi-dashboard-score-note');
 if(scoreNote)scoreNote.textContent=scoreDetalhes.status||'Saúde financeira';
 const health=document.getElementById('dashboard-health-status');
 const healthText=document.getElementById('dashboard-health-text');
 const healthClass=scoreDetalhes.total>=85?'positive-fin':scoreDetalhes.total<55?'negative-fin':'';
 if(health){health.className=healthClass;health.textContent=scoreDetalhes.status||'Em análise';}
 if(healthText){healthText.textContent=`Score ${scoreDetalhes.total||0}/100 · Reserva ${cobertura.toFixed(1)} meses · Sobra ${brl(at.resultado)}.`;healthText.className=at.resultado<0?'negative-fin':at.resultado>0?'positive-fin':'';}
 const inv=dashboardCardSummary(year,month);
 const top=inv.best, cardTotal=document.getElementById('kpi-dashboard-card-total'),cardNote=document.getElementById('kpi-dashboard-card-note'),cardMini=document.getElementById('dashboard-invoice-card'),cardMiniText=document.getElementById('dashboard-invoice-text');
 if(cardTotal)cardTotal.textContent=brl(inv.total);
 if(cardNote)cardNote.textContent=top?`${top.card.nome} · ${top.days<=0?'vence hoje':top.days===1?'vence amanhã':`vence em ${top.days} dias`}`:'Sem fatura pendente';
 if(cardMini){cardMini.textContent=top?`${top.card.nome}: ${brl(top.total)}`:'Nenhuma fatura pendente';cardMini.className=top?'':'muted';}
 if(cardMiniText)cardMiniText.textContent=top?(top.days<=0?'Vencimento hoje':top.days===1?'Vencimento amanhã':`Vencimento em ${top.days} dias`):'Se houver uma fatura em aberto, ela aparecerá aqui.';
 const goals=Array.isArray(appData.metas)?appData.metas:[]; const done=goals.filter(m=>Number(m.acumulado||0)>=Number(m.objetivo||0)).length; const late=goals.filter(m=>Number(m.acumulado||0)<Number(m.objetivo||0)&&parseDate(m.prazo)<hoje()).length; const active=Math.max(0,goals.length-done-late);
 const g=document.getElementById('dashboard-goals-status'),gt=document.getElementById('dashboard-goals-text');
 if(g){g.textContent=goals.length?`${done}/${goals.length} concluídas`:'Nenhuma meta';g.className=late?'negative-fin':'';}
 if(gt)gt.textContent=goals.length?`${active} em andamento · ${late} atrasada${late===1?'':'s'}.`:'Crie metas para acompanhar seu progresso.';
 renderDashboardFinanceTrend();
}
function renderDashboardFinanceTrend(){
 const canvas=document.getElementById('chartDashboardFinanceTrend'); if(!canvas||typeof Chart==='undefined')return;
 if(chartDashboardFinanceTrendInstance){chartDashboardFinanceTrendInstance.destroy();chartDashboardFinanceTrendInstance=null;}
 const d=dashboardYM(); const labels=[],rec=[],desp=[],sob=[];
 for(let i=5;i>=0;i--){const dt=addMonthsSafe(new Date(d.year,d.month-1,1),-i);const y=dt.getFullYear(),m=dt.getMonth()+1;const at=calculateMonthlyTotals(y,m);labels.push(monthLabel(y,m).slice(0,3));rec.push(Number(at.receitas)||0);desp.push(Number(at.despesas)||0);sob.push(Number(at.resultado)||0);}
 chartDashboardFinanceTrendInstance=new Chart(canvas,{type:'line',data:{labels,datasets:[
   {label:'Receitas',data:rec,borderColor:cssVar('--success'),backgroundColor:'transparent',borderWidth:2,pointRadius:2,tension:.28},
   {label:'Despesas',data:desp,borderColor:cssVar('--danger'),backgroundColor:'transparent',borderWidth:2,pointRadius:2,tension:.28},
   {label:'Sobra',data:sob,borderColor:cssVar('--info'),backgroundColor:'transparent',borderWidth:2.5,pointRadius:3,tension:.28}
 ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{color:cssVar('--muted'),boxWidth:10,font:{size:10}}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${brl(ctx.parsed.y)}`}}},scales:{x:{grid:{display:false},ticks:{color:cssVar('--muted')}},y:{grid:{color:cssVar('--border')},ticks:{color:cssVar('--muted'),callback:v=>brl(v)}}}}});
}
function renderDashboardZeroState(){
  const card=$('dashboard-patrimonio-kpi');
  const def=$('patrimonio-kpi-default');
  const invite=$('dashboard-zero-patrimonio');
  if(!card||!def||!invite)return;
  const hasPatrimonio=Array.isArray(appData.patrimonio)&&appData.patrimonio.length>0;
  invite.classList.toggle('hidden',hasPatrimonio);
  def.classList.toggle('hidden',!hasPatrimonio);
  card.classList.toggle('zero-invite-card',!hasPatrimonio);
}

function atualizarDashboard(){
 const {year,month}=dashboardYM(),at=calculateMonthlyTotals(year,month),prevDate=addMonthsSafe(new Date(year,month-1,1),-1),prev=calculateMonthlyTotals(prevDate.getFullYear(),prevDate.getMonth()+1),nw=calculateNetWorth(),liq=calculateLiquidAssets(),reserva=calculateEmergencyReserve(),avg=avgExpenses(6),media=avg.media,cobertura=media?reserva/media:0;
 const setText=(id,value)=>{const el=$(id);if(el)el.textContent=value};
 const setClass=(id,value)=>{const el=$(id);if(el)el.className=value};
 const sel=$('dashboardMes');if(sel)sel.value=selectedDashboardMonth;
 setText('dashboard-periodo',new Date(year,month-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}));

 // The simplified dashboard intentionally keeps only four primary KPIs.
 // Legacy KPI IDs are updated only when present, so a dashboard redesign
 // cannot break the entire render cycle.
 setText('kpi-entradas',brl(at.receitas));
 setText('kpi-saidas',brl(at.despesas));
 setText('kpi-resultado',brl(at.resultado));
 setText('kpi-economia',at.taxaEconomia.toFixed(1)+'%');
 setText('kpi-investimento',brl(at.investimentos));
 setText('kpi-patrimonio',brl(nw.liquido));
 renderDashboardZeroState();
 setText('kpi-reserva',cobertura.toFixed(1)+' meses');
 const signedClass=(v)=>Number(v)>0?'fin-positive':Number(v)<0?'fin-negative':'fin-neutral';
 setClass('kpi-entradas',signedClass(at.receitas));
 setClass('kpi-saidas','fin-negative');
 setClass('kpi-resultado',signedClass(at.resultado));
 setClass('kpi-investimento',signedClass(at.investimentos));
 setClass('kpi-patrimonio',signedClass(nw.liquido));
 setClass('kpi-reserva',signedClass(cobertura));
 setText('kpi-reserva-nota',avg.meses<6?`Baseado em ${avg.meses} ${avg.meses===1?'mês':'meses'} de histórico`:'Liquidez / média de despesas');

 const ic=pctChange(at.investimentos,prev.investimentos);
 setText('kpi-investimento-comp',ic===null?'Aportes do mês':'vs mês anterior: '+(ic>=0?'↑ ':'↓ ')+Math.abs(ic).toFixed(1)+'%');
 setText('kpi-economia-meta',`Meta: ${appData.metaEconomia.toFixed(1)}% · ${(at.taxaEconomia-appData.metaEconomia>=0?'+':'')+(at.taxaEconomia-appData.metaEconomia).toFixed(1)} p.p.`);
 const progresso=Math.max(0,Math.min(100,appData.metaEconomia?at.taxaEconomia/appData.metaEconomia*100:0));
 const ecoProgress=$('kpi-economia-progress');if(ecoProgress)ecoProgress.style.width=progresso+'%';
 setText('kpi-sobra-nota',at.resultado>0?'Resultado positivo do mês':at.resultado<0?'Mês de ajuste':'Resultado equilibrado');

 renderizarEvolucaoPatrimonioLiquido();
 renderDashboardFinanceTrend();
 renderDashboardDecisionCenter();

 setText('dash-entradas',brl(at.receitas));
 setText('dash-saidas',brl(at.despesas));
 setText('dash-investimentos',brl(at.investimentos));
 const resumo=$('dash-resultado-resumo');if(resumo){resumo.textContent=brl(at.resultado);resumo.className=at.resultado<0?'expense':'income';}

 gerarDiagnostico(at,nw,cobertura,prev,prevDate.getFullYear(),prevDate.getMonth()+1,year,month);
 calcularGastoSeguro(at,year,month);
}

function renderizarEvolucaoPatrimonioLiquido(){
  const canvas=$('chartPatrimonioLiquido');
  if(!canvas)return;
  if(chartPatrimonioLiquidoInstance){chartPatrimonioLiquidoInstance.destroy();chartPatrimonioLiquidoInstance=null;}
  const snapshots=[...(appData.snapshotsPatrimonio||[])]
    .filter(s=>s&&/^\d{4}-\d{2}$/.test(String(s.mes))&&Number.isFinite(Number(s.liquido)))
    .sort((a,b)=>String(a.mes).localeCompare(String(b.mes)))
    .slice(-6);
  const atual=calculateNetWorth().liquido;
  const atualEl=$('pat-evolucao-atual'),varEl=$('pat-evolucao-variacao'),periodoEl=$('pat-evolucao-periodo');
  if(atualEl)atualEl.textContent=brl(atual);
  if(!snapshots.length){
    if(varEl)varEl.textContent='Sem histórico';
    if(periodoEl)periodoEl.textContent='Aguardando fechamentos';
    canvas.style.display='none';
    let empty=canvas.parentElement.querySelector('.chart-empty');
    if(!empty){empty=document.createElement('div');empty.className='chart-empty';empty.textContent='Feche os meses para construir o histórico do patrimônio líquido.';canvas.parentElement.appendChild(empty);}
    return;
  }
  canvas.style.display='block';
  const oldEmpty=canvas.parentElement.querySelector('.chart-empty');
  if(oldEmpty)oldEmpty.remove();
  if(typeof Chart==='undefined'){canvas.style.display='none';return;}
  const labels=snapshots.map(s=>{const [y,m]=String(s.mes).split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'short'}).replace('.','').replace(/^./,c=>c.toUpperCase());});
  const valores=snapshots.map(s=>Number(s.liquido)||0);
  const primeiro=valores[0];
  const ultimo=valores[valores.length-1];
  const variacao=ultimo-primeiro;
  if(varEl){varEl.textContent=(variacao>=0?'+':'')+brl(variacao);varEl.className=variacao>=0?'positive-value':'danger-value';}
  if(periodoEl)periodoEl.textContent=snapshots.length+' '+(snapshots.length===1?'mês':'meses');
  chartPatrimonioLiquidoInstance=new Chart(canvas,{
    type:'line',
    data:{labels,datasets:[{data:valores,label:'Patrimônio líquido',borderColor:cssVar('--primary'),backgroundColor:'transparent',borderWidth:2.5,pointRadius:4,pointHoverRadius:6,pointBackgroundColor:cssVar('--primary'),pointBorderColor:cssVar('--panel'),pointBorderWidth:2,tension:.28,fill:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>'Patrimônio líquido: '+brl(ctx.parsed.y)}}},scales:{x:{grid:{display:false},ticks:{color:cssVar('--muted')}},y:{grid:{color:cssVar('--border')},ticks:{color:cssVar('--muted'),callback:v=>brl(v)}}}}
  });
}

function calcularScoreDinamico(at,nw,cobertura,year=dashboardYM().year,month=dashboardYM().month){
 const taxaInv=at.receitas?(at.investimentos/at.receitas)*100:0,comp=at.receitas?(at.despesas/at.receitas)*100:100;
 const gastoOrc=Object.entries(appData.orcamento).map(([cat,teto])=>{const r=getMonthTransactions(year,month).filter(t=>t.tipo==='despesa'&&String(t.categoria).toLowerCase()===cat.toLowerCase()).reduce((a,t)=>a+transactionAmount(t),0);return teto?r/teto:0});
 const controle=gastoOrc.length?(gastoOrc.filter(x=>x<=1).length/gastoOrc.length)*10:10;
 const pLiquidez=Math.min(20,cobertura/6*20),pEco=Math.max(0,Math.min(15,at.taxaEconomia/Math.max(1,appData.metaEconomia)*15)),pInv=Math.min(15,taxaInv/15*15),pComp=Math.max(0,Math.min(15,(100-comp)/70*15)),pOrc=controle,pPat=nw.liquido>0?15:0;
 const metas=appData.metas.length?Math.min(10,appData.metas.filter(m=>Number(m.acumulado)>=Number(m.objetivo)*.5).length/appData.metas.length*10):10;
 const values=[pLiquidez,pEco,pInv,pComp,pOrc,pPat,metas], total=Math.round(values.reduce((a,b)=>a+b,0));
 const labels=['Liquidez','Economia','Investimentos','Comprometimento','Orçamento','Patrimônio','Metas'];
 const max=[20,15,15,15,10,15,10];
 const status=total>=85?'Excelente':total>=70?'Boa saúde, com oportunidades de melhoria':total>=55?'Atenção a alguns pilares':'Necessita intervenção';
 scoreDetalhes={total,valores:values,status,pilares:labels.map((nome,i)=>({nome,valor:values[i],max:max[i],pct:max[i]?values[i]/max[i]*100:0}))};
 if($('kpi-score-mini'))$('kpi-score-mini').textContent=total+'/100';
}
function abrirScoreModal(){
 const box=$('score-pillars');if(!box)return;
 $('score-modal-status').textContent=`Score ${scoreDetalhes.total}/100 · ${scoreDetalhes.status}`;
 box.innerHTML=scoreDetalhes.pilares.map(p=>`<div class="score-pillar"><div><b>${escapeHtml(p.nome)}</b><span>${p.valor.toFixed(1)} / ${p.max}</span></div><div class="progress"><i style="width:${Math.min(100,p.pct)}%"></i></div></div>`).join('');
 $('scoreModal').classList.add('open');
}
function fecharScoreModal(){$('scoreModal').classList.remove('open')}
function categoriaTotals(y,m){const map={};getMonthTransactions(y,m).filter(t=>t.tipo==='despesa').forEach(t=>{const cat=t.categoria||'Outros';map[cat]=(map[cat]||0)+Number(t.valorParcela||t.valorTotal||0)});return map}
function getBudgetTotal(){return Object.values(appData.orcamento).reduce((s,v)=>s+(Number(v)||0),0)}
function getBudgetFinalPlannedTotal(){return getBudgetTotal()}
function getBudgetRealizedTotal(year=dashboardYM().year,month=dashboardYM().month){return getMonthTransactions(year,month).filter(t=>t.tipo==='despesa').reduce((s,t)=>s+Number(t.valorParcela||t.valorTotal||0),0)}
function categoryAlerts(year,month){const rows=[];Object.entries(appData.orcamento).forEach(([cat,teto])=>{const realizado=getMonthTransactions(year,month).filter(t=>t.tipo==='despesa'&&String(t.categoria).toLowerCase()===cat.toLowerCase()).reduce((s,t)=>s+Number(t.valorParcela||0),0);const util=teto?realizado/teto*100:0;if(util>=100)rows.push(`🔴 Você já gastou <b>${brl(realizado)}</b> em <b>${cat}</b>, acima do limite de ${brl(teto)}. Considere reduzir gastos nesta categoria.`);else if(util>=80)rows.push(`🟡 Atenção: sua categoria <b>${cat}</b> está em ${util.toFixed(0)}% do orçamento. Evite gastos extras até o fim do mês.`)});return rows}
function gerarDiagnostico(at,nw,cobertura,prev,prevYear,prevMonth,year=dashboardYM().year,month=dashboardYM().month){
 const items=[];
 if(at.taxaEconomia>=appData.metaEconomia)items.push(`🌟 Você está economizando <b>${at.taxaEconomia.toFixed(1)}%</b> da renda, acima da sua meta de ${appData.metaEconomia.toFixed(1)}%.`);
 else {const gap=appData.metaEconomia-at.taxaEconomia;items.push(`🌟 Você já está poupando <b>${Math.max(0,at.taxaEconomia).toFixed(1)}%</b> da renda. Para chegar à sua meta de ${appData.metaEconomia.toFixed(1)}%, faltam <b>${gap.toFixed(1)} p.p.</b>.`)}
 if(cobertura<6)items.push(`🛡️ Sua reserva cobre <b>${cobertura.toFixed(1)} meses</b>. Para chegar a 6 meses, faltam <b>${Math.max(0,6-cobertura).toFixed(1)} meses</b>.`);else items.push(`🛡️ Sua liquidez cobre <b>${cobertura.toFixed(1)} meses</b> de despesas médias.`);
 if(nw.liquido<0)items.push(`<b>Contexto:</b> seu patrimônio líquido está negativo. O próximo passo é reduzir a dívida antes de ampliar compromissos.`);
 const alerts=categoryAlerts(year,month);items.push(...alerts.slice(0,3));
 if(prev){const dc=pctChange(at.despesas,prev.despesas);if(dc!==null&&dc<=-1)items.push(`🟢 Suas despesas caíram <b>${Math.abs(dc).toFixed(0)}%</b> em relação ao mês passado.`);else if(dc!==null&&dc>=10)items.push(`🔎 Suas despesas subiram <b>${dc.toFixed(0)}%</b> em relação ao mês passado. Vale revisar as categorias que mais pesaram.`)}
 if($('assistant-diagnostico'))$('assistant-diagnostico').innerHTML=items.map(x=>`<div>• ${x}</div>`).join('');
 const actions=[];
 if(cobertura<6)actions.push({title:'🛡️ Reserva',text:`Foco da semana: sua reserva está em ${cobertura.toFixed(1)} meses. Um aporte extra de ${brl(Math.max(100,(6-cobertura)*Math.max(1,avgExpenses().media)/6))} pode acelerar a recuperação.`,button:'Como fortalecer a reserva',tab:'orcamento'});
 const passivos=appData.patrimonio.filter(p=>p.classe==='Passivo');
 if(!actions.length&&passivos.length)actions.push({title:'💳 Dívidas',text:'Sua próxima prioridade é acompanhar o custo das dívidas e buscar amortização quando o juro estiver acima da rentabilidade dos ativos.',button:'Ver patrimônio',tab:'patrimonio'});
 if(!actions.length)actions.push({title:'📈 Aportes',text:`Você está no caminho. Se puder, direcione parte da sobra de ${brl(Math.max(0,at.resultado))} para suas metas e investimentos.`,button:'Abrir metas',tab:'metas'});
 const goalAlerts=appData.metas.map(m=>{const r=Number(m.objetivo)-Number(m.acumulado);if(r<=0)return null;const prazo=parseDate(m.prazo);const months=Math.max(1,(prazo-hoje())/(1000*60*60*24*30.44));const aporte=r/months;return aporte>Math.max(0,at.resultado)?{nome:m.nome,aporte}:null}).filter(Boolean);
 if(goalAlerts.length)actions.push({title:'🎯 Meta',text:`A meta <b>${goalAlerts[0].nome}</b> pede cerca de ${brl(goalAlerts[0].aporte)}/mês no prazo atual. Em vez de apertar o orçamento, considere alongar o prazo e simular um aporte menor.`,button:'Ajustar meta',tab:'metas'});
 if($('assistant-plano-voo'))$('assistant-plano-voo').innerHTML=actions.slice(0,3).map((a,i)=>`<div class="flight-item"><div><span class="badge ${i===0?'good':''}">${i===0?'Prioridade máxima':'Próximo passo'}</span><h4>${a.title}</h4><p>${a.text}</p></div><button class="btn-sm" onclick="goToTab('${a.tab}')">${a.button}</button></div>`).join('');
}
function calcularGastoSeguro(at,year=dashboardYM().year,month=dashboardYM().month){
 const safe=calculateSafeSpending(at,year,month);
 const planejado=safe.orçamento,realizado=safe.realizado,saldo=planejado-realizado,percentual=planejado>0?(realizado/planejado)*100:0,excedido=safe.pressao?Math.max(0,-Number(at?.fluxoLivre||0)):Math.max(0,realizado-planejado),margem=safe.valor;
 if($('kpi-gasto'))$('kpi-gasto').textContent=brl(margem);
 if($('kpi-gasto-nota'))$('kpi-gasto-nota').textContent=safe.pressao?'Cenário pede contenção':'Margem segura para o mês';

 // The 4.6.2 Dashboard uses the new Decision Center for "Quanto posso gastar".
 // Older spending widgets were intentionally removed from the HTML, so every
 // legacy element below is optional. The calculation itself must never abort
 // the Dashboard render merely because a legacy presentation node is absent.
 const principal=$('gasto-seguro');
 const label=$('gasto-seguro-label');
 const status=$('gasto-status');
 const percentEl=$('gasto-percent');
 const excessBox=$('gasto-excesso-box');
 const excessLabel=$('gasto-excesso-label');
 const excessValue=$('gasto-excesso');
 const displayValue=brl(excedido>0?excedido:margem);
 const displayLabel=excedido>0?'valor excedido':'margem disponível';
 const displayPercent=planejado>0?`${percentual.toFixed(0)}%`:'0%';

 if(principal){principal.textContent=displayValue;}
 if(label){label.textContent=displayLabel;}
 if(status){status.textContent=excedido>0?'⚠ Orçamento excedido':saldo===0?'⚠ Orçamento atingido':'✓ Saldo disponível';}
 if(percentEl){percentEl.textContent=displayPercent;}
 if($('gs-orcamento-mini'))$('gs-orcamento-mini').textContent=brl(planejado);
 if($('gs-aporte-mini'))$('gs-aporte-mini').textContent=brl(realizado);

 const gaugeProgress=Math.min(100,Math.max(0,percentual));
 const speedFill=$('gasto-speed-fill');
 if(speedFill){speedFill.style.strokeDasharray='100';speedFill.style.strokeDashoffset=String(100-gaugeProgress);speedFill.classList.remove('healthy','warning','danger');speedFill.classList.add(percentual>100?'danger':(percentual>=80?'warning':'healthy'));}

 if(principal){principal.className=excedido>0?'danger-value':saldo===0?'warn-value':'positive-value';}
 if(status){status.className=`badge ${excedido>0?'danger':saldo===0?'warn':'good'}`;}
 if(excessBox){excessBox.className=`spending-excess ${excedido>0?'danger-box':saldo===0?'warn-box':'good-box'}`;}
 if(excessLabel){excessLabel.textContent=excedido>0?'Excedido':'Saldo disponível';}
 if(excessValue){excessValue.textContent=excedido>0?brl(excedido):saldo===0?'R$ 0,00':brl(margem);}
}
function dicaScore(){const {year,month}=dashboardYM(),at=calculateMonthlyTotals(year,month),nw=calculateNetWorth();let d=categoryAlerts(year,month)[0]|| (at.taxaEconomia<appData.metaEconomia?`Tente elevar sua economia em ${Math.min(5,appData.metaEconomia-at.taxaEconomia).toFixed(1)} p.p. neste mês.`:(nw.liquido<0?'Priorize a redução de passivos antes de ampliar investimentos.':'Você está equilibrado. Use a sobra para acelerar uma meta.'));finToastInfo(d.replace(/<[^>]+>/g,''))}
function goToTab(tab){const btn=document.querySelector(`.nav-btn[onclick*="switchTab('${tab}'"]`);if(btn)switchTab(tab,btn)}

let finOpen=false;
function finCurrentTab(){const a=document.querySelector('.tab-content.active');return a?.id?.replace('tab-','')||'dashboard'}
function finContextLabel(tab){return ({dashboard:'Visão geral, fluxo e saúde financeira.',orcamento:'Orçamento, desvios e margem disponível.',patrimonio:'Ativos, passivos, liquidez e patrimônio líquido.',cartoes:'Faturas, compromissos e pagamento.',metas:'Metas, ritmo de aporte e prazo.',extrato:'Histórico, padrões e lançamentos.',simulador:'Cenários, decisões e custo de oportunidade.'}[tab])||'Analisando sua situação atual.'}
function finInsightGlobal(){
  const d=finDataContext(); const rec=obterPrincipalRecomendacao(); const cards=[];
  const recurrence=rec.recorrencia;
  if(rec.peso>0) cards.push({level:rec.level,ey:rec.level==='danger'?'PRIORIDADE':rec.level==='warning'?'ATENÇÃO':'OPORTUNIDADE',title:rec.titulo,text:rec.problema+' '+rec.motivo,why:rec.recorrencia||`Uma possibilidade é: ${rec.acao}`,action:rec.tab?`goToTab('${rec.tab}')`:null,label:rec.tab?'Ver esta área':'Ver detalhes',ruleId:rec.id});
  else cards.push({level:'success',ey:'STATUS',title:'Seu cenário está estável neste momento',text:'Os dados atuais não mostram um ponto que exija uma intervenção imediata.',why:'Quando não existe uma decisão relevante ou um risco significativo, o FIN prefere não criar ruído.',ruleId:null});
  const secondary=obterRegrasFINAplicaveis().find(r=>r.id!==rec.id && r.peso>=65);
  if(secondary){const m=secondary.mensagem;cards.push({level:secondary.level,ey:secondary.level==='warning'?'ATENÇÃO':'PONTO PARA OBSERVAR',title:m.titulo,text:m.problema+' '+m.motivo,why:secondary.id?finInsightRecurrence(secondary.id)||`Uma possibilidade é: ${m.acao}`:'',action:secondary.tab?`goToTab('${secondary.tab}')`:null,label:'Entender',ruleId:secondary.id});}
  return {...d,cards,rec};
}
function finTeaching(tab,data){
 const map={
  dashboard:{title:'Aprenda: patrimônio líquido',text:'Patrimônio líquido é o total dos ativos menos o total dos passivos. Um imóvel financiado pode fazer parte do patrimônio, mas o valor comprometido com a dívida também precisa ser considerado.',action:"goToTab('patrimonio')",label:'Explorar patrimônio'},
  orcamento:{title:'Aprenda: planejado e realizado',text:'O planejado representa o limite que você definiu. O realizado mostra o que aconteceu. A diferença ajuda você a entender sua margem de escolha para o restante do mês.',action:null},
  patrimonio:{title:'Aprenda: liquidez e patrimônio são coisas diferentes',text:'Um imóvel pode contribuir para o patrimônio, mas não significa que esse valor esteja disponível imediatamente. Liquidez indica o quanto de um recurso pode ser utilizado com facilidade.',action:null},
  cartoes:{title:'Aprenda: fatura e pagamento têm papéis diferentes',text:'A fatura representa uma obrigação do período. Quando ela é paga, o caixa é reduzido e o comprometimento do cartão é liberado. O pagamento não deve ser contado novamente como uma nova despesa.',action:null},
  metas:{title:'Aprenda: o ritmo de aporte influencia o prazo',text:'O prazo de uma meta depende do valor acumulado, do objetivo e do ritmo de aportes. Alterar o aporte pode mudar o prazo projetado.',action:null},
  extrato:{title:'Aprenda: padrões ajudam mais do que um lançamento isolado',text:'Um lançamento individual conta uma parte da história. Comparar médias, orçamento e evolução mensal ajuda a entender mudanças e tomar decisões com mais contexto.',action:null},
  simulador:{title:'Aprenda: toda decisão tem custo de oportunidade',text:'Além do preço, uma escolha pode afetar margem, metas, liquidez e rendimentos futuros. Comparar cenários ajuda você a escolher de acordo com seus objetivos.',action:null}
 };
 return map[tab]||map.dashboard;
}
function renderPreferenciasFIN(){
 const c=appData.finConfig||{};
 if($('finReservaMeses'))$('finReservaMeses').value=c.reservaMeses??6;
 if($('finDesvioPct'))$('finDesvioPct').value=c.desvioCategoriaPct??30;
 if($('finCartaoPct'))$('finCartaoPct').value=c.comprometimentoCartaoPct??30;
 if($('finVoz'))$('finVoz').checked=!!c.voz;
}
function salvarPreferenciasFIN(){
 appData.finConfig={
  reservaMeses:Math.max(1,Math.min(24,Number($('finReservaMeses')?.value)||6)),
  desvioCategoriaPct:Math.max(5,Math.min(200,Number($('finDesvioPct')?.value)||30)),
  comprometimentoCartaoPct:Math.max(5,Math.min(100,Number($('finCartaoPct')?.value)||30)),
  voz:!!$('finVoz')?.checked
 };
 saveData(); renderPreferenciasFIN(); finRender();
}

/* ============================================================
   FIN Decision Assistant 4.2
   Evento → relevância → contexto → decide SE / O QUE / QUANDO / QUANTO
   ============================================================ */
function finUserBehaviorSignals(){
  const log=appData.finInsightsLog||[];
  const recent=log.slice(-40);
  const seen=recent.filter(x=>x.visto).length;
  const ignored=recent.filter(x=>x.acao==='ignorado').length;
  const approved=recent.filter(x=>x.acao==='aprofundou').length;
  const totalActed=ignored+approved;
  const followRate=totalActed?approved/totalActed:0.5;
  const ignoreRate=totalActed?ignored/totalActed:0;
  return {seen,ignored,approved,followRate,ignoreRate,sample:recent.length};
}
function finGoalPressure(){
  const metas=(appData.metas||[]).filter(m=>m && !m.concluida);
  if(!metas.length)return {pressure:0,late:0,count:0};
  let late=0,pressure=0;
  metas.forEach(m=>{
    const alvo=Number(m.valorAlvo||m.meta||0),atual=Number(m.valorAtual||m.atual||0);
    const prazo=m.prazo||m.dataLimite;
    const pct=alvo>0?atual/alvo:0;
    if(prazo){
      const days=(new Date(prazo)-Date.now())/86400000;
      if(days<0 && pct<1){late++;pressure+=2;}
      else if(days>=0 && days<60 && pct<0.4)pressure+=1.2;
      else if(days>=0 && days<120 && pct<0.25)pressure+=0.6;
    }
  });
  return {pressure:Math.min(3,pressure),late,count:metas.length};
}
function finDecisionContext(){return window.FIN_MODULES.decision.context({data:()=>appData,dataContext:finDataContext,userBehaviorSignals:finUserBehaviorSignals,goalPressure:finGoalPressure});}
function finScoreRelevance(candidate,ctx){return window.FIN_MODULES.decision.score(candidate,ctx,{data:()=>appData,lastRuleLog:finLastRuleLog,ruleWasRecent:finRuleWasRecent});}
function finDecideSpeak(candidates,ctx){return window.FIN_MODULES.decision.decide(candidates,ctx,{data:()=>appData,lastRuleLog:finLastRuleLog,ruleWasRecent:finRuleWasRecent});}
function finDecisionForCurrentScenario(){return window.FIN_MODULES.decision.current({data:()=>appData,dataContext:finDataContext,userBehaviorSignals:finUserBehaviorSignals,goalPressure:finGoalPressure,lastRuleLog:finLastRuleLog,ruleWasRecent:finRuleWasRecent,rules:obterRegrasFINAplicaveis});}

/* ============================================================
   FIN Decision Cycle 4.3
   Detectar → Entender → Comparar → Decidir → Acompanhar
   ============================================================ */
const FIN_STAGES=['discover','understand','compare','decide','track'];
const FIN_STAGE_META={
  discover:{label:'Descoberta',hint:'Existe um ponto que merece atenção.',order:0},
  understand:{label:'Entendimento',hint:'Aqui está o impacto no seu cenário.',order:1},
  compare:{label:'Comparação',hint:'Existem alternativas para comparar.',order:2},
  decide:{label:'Decisão',hint:'Registre a escolha que você fez.',order:3},
  track:{label:'Acompanhamento',hint:'Vamos ver o que aconteceu depois da decisão.',order:4}
};

function finEnsureJourney(ruleId,seed={}){return window.FIN_MODULES.journey.ensure({data:()=>appData,save:(refresh)=>saveData({refresh}),snapshot:finJourneySnapshot},ruleId,seed);}
function finGetJourney(ruleId){return window.FIN_MODULES.journey.get({data:()=>appData},ruleId);}
function finActiveJourneys(){return window.FIN_MODULES.journey.active({data:()=>appData});}
function finJourneySnapshot(){
  try{
    const d=finDataContext();
    return {
      at:new Date().toISOString(),
      fluxoLivre:Number(d.at?.fluxoLivre||0),
      despesas:Number(d.at?.despesas||0),
      receitas:Number(d.at?.receitas||0),
      liquido:Number(d.nw?.liquido||0),
      dividas:Number(d.nw?.dividas||0),
      jurosFuturos:Number(d.nw?.jurosFuturos||0),
      cobertura:Number(d.cobertura||0),
      cart:Number(d.cart||0),
      pend:Number(d.pend||0)
    };
  }catch(e){return {at:new Date().toISOString()};}
}

/* ============================================================
   FIN 4.4 — Outcome Loop
   Decidir → Acompanhar → Avaliar resultado → Aprender
   ============================================================ */
function finOutcomeCriteria(ruleId){return window.FIN_MODULES.outcome.criteria(ruleId);}

function finMetricLabel(key){return window.FIN_MODULES.outcome.metricLabel(key);}
function finFormatMetricDelta(key,before,after,delta){return window.FIN_MODULES.outcome.formatDelta(key,before,after,delta,brl);}
const FIN_OUTCOME_POLICY=Object.freeze({
  minDaysBeforeVerdict:7,
  strongSignalDays:30,
  minimumEvidence:2,
  strongHistorySamples:5
});
function finGetOutcomePolicy(){
  const o=(typeof appData!=='undefined'&&appData&&appData.finOutcomePolicy)||{};
  return {
    minDaysBeforeVerdict:Math.max(0,Number(o.minDaysBeforeVerdict??FIN_OUTCOME_POLICY.minDaysBeforeVerdict)||0),
    strongSignalDays:Math.max(0,Number(o.strongSignalDays??FIN_OUTCOME_POLICY.strongSignalDays)||0),
    minimumEvidence:Math.max(0,Number(o.minimumEvidence??FIN_OUTCOME_POLICY.minimumEvidence)||0),
    strongHistorySamples:Math.max(0,Number(o.strongHistorySamples??FIN_OUTCOME_POLICY.strongHistorySamples)||0)
  };
}
function finShouldDeferVerdict(journey,policy=finGetOutcomePolicy()){
  return finJourneyAgeDays(journey)<policy.minDaysBeforeVerdict;
}

function finJourneyAgeDays(journey){return window.FIN_MODULES.journey.ageDays(journey);}
function finEvaluateOutcome(before,after,ruleId,opts={}){
  const policy=finGetOutcomePolicy();
  return window.FIN_MODULES.outcome.evaluate(
    before,after,ruleId,
    {...opts,policy,minDays:policy.minDaysBeforeVerdict},
    brl
  );
}
function finJourneyAlternatives(ruleId,data){
  const d=data||finDataContext();
  const fluxo=brl(d.at?.fluxoLivre||0);
  const map={
    cash_risk:[
      {id:'cut_discretionary',label:'Reduzir discricionários',desc:'Cortar ou adiar gastos não essenciais até a projeção estabilizar.'},
      {id:'shift_income',label:'Antecipar/reforçar receita',desc:'Buscar antecipação de recebíveis ou renda extra no período crítico.'},
      {id:'restructure',label:'Reestruturar compromissos',desc:'Negociar prazos ou parcelamentos que aliviem o caixa projetado.'}
    ],
    reserve_low:[
      {id:'boost_reserve',label:'Priorizar reserva',desc:'Direcionar a próxima sobra para Reserva de Emergência.'},
      {id:'adjust_target',label:'Recalibrar meta de meses',desc:'Ajustar a referência de cobertura se o perfil de risco mudou.'},
      {id:'pause_extra',label:'Pausar extras temporariamente',desc:'Suspender aportes não essenciais até atingir a cobertura mínima.'}
    ],
    card_pressure:[
      {id:'no_new_installments',label:'Não parcelar novos itens',desc:'Evitar novas parcelas até o comprometimento cair.'},
      {id:'pay_extra',label:'Pagamento extra da fatura',desc:'Usar parte do fluxo livre para reduzir o saldo rotativo/parcelado.'},
      {id:'review_subs',label:'Revisar recorrências no cartão',desc:'Cancelar ou migrar assinaturas e gastos automáticos.'}
    ],
    budget_pending:[
      {id:'clear_pending',label:'Zerar pendências primeiro',desc:'Priorizar o pagamento do que ficou para trás.'},
      {id:'renegotiate',label:'Renegociar categorias',desc:'Ajustar tetos irreais e redistribuir o orçamento.'},
      {id:'freeze_category',label:'Congelar categoria estourada',desc:'Pausar novos gastos na categoria com pendência.'}
    ],
    goal_late:[
      {id:'extend_deadline',label:'Estender o prazo',desc:'Recalibrar a data-alvo para um ritmo sustentável.'},
      {id:'raise_contribution',label:'Aumentar aporte',desc:'Elevar o aporte mensal para recuperar o atraso.'},
      {id:'split_goal',label:'Dividir a meta',desc:'Partir o objetivo em marcos intermediários.'}
    ],
    financing_interest:[
      {id:'amort_prazo',label:'Amortizar reduzindo prazo',desc:'Usar sobra para encurtar o financiamento e cortar juros.'},
      {id:'amort_parcela',label:'Amortizar reduzindo parcela',desc:'Reduzir a parcela mensal e liberar fluxo.'},
      {id:'keep_observing',label:'Manter e observar',desc:'Não amortizar agora; acompanhar taxa e sobra por mais um ciclo.'}
    ],
    amortization_opportunity:[
      {id:'amort_now',label:'Amortizar agora',desc:'Simular e executar amortização extraordinária.'},
      {id:'invest_instead',label:'Investir a sobra',desc:'Preferir investir se o retorno esperado superar o custo da dívida.'},
      {id:'split_use',label:'Dividir sobra',desc:'Parte em amortização, parte em reserva/metas.'}
    ],
    free_cash:[
      {id:'to_reserve',label:'Reforçar reserva',desc:`Alocar parte de ${fluxo} na reserva de emergência.`},
      {id:'to_goals',label:'Acelerar metas',desc:'Direcionar a sobra para metas prioritárias.'},
      {id:'to_invest',label:'Investir',desc:'Aportar em investimentos alinhados ao horizonte.'}
    ],
    audit_duplicate:[
      {id:'review_now',label:'Revisar agora',desc:'Abrir o extrato e confirmar duplicidades.'},
      {id:'mark_later',label:'Revisar depois',desc:'Adiar a revisão e pedir lembrete no próximo ciclo.'},
      {id:'ignore_false',label:'Marcar como falso positivo',desc:'Se não for duplicidade real, encerrar este ciclo.'}
    ]
  };
  const base=map[ruleId]||[
    {id:'act_now',label:'Agir agora',desc:'Executar a ação sugerida pelo FIN.'},
    {id:'simulate',label:'Simular antes',desc:'Comparar cenários no Simulador.'},
    {id:'wait',label:'Aguardar e observar',desc:'Não agir neste momento; acompanhar a evolução.'}
  ];
  // 4.4: ranquear alternativas pelo histórico de outcomes
  return finRankAlternatives(ruleId,base);
}
function finJourneyStageContent(journey,ruleMsg,data){
  const stage=journey.stage||'discover';
  const meta=FIN_STAGE_META[stage];
  const alts=finJourneyAlternatives(journey.id,data);
  if(stage==='discover'){
    return {
      title:ruleMsg?.titulo||'Ponto identificado',
      body:ruleMsg?.problema||'O FIN detectou um ponto no seu cenário.',
      detail:null,
      actions:[
        {label:'Entender o impacto',fn:`finAdvanceJourney('${journey.id}','understand');finRender()`},
        {label:'Já vi',fn:`finMarkInsight('${journey.id}','ignorado')`,ghost:true}
      ]
    };
  }
  if(stage==='understand'){
    return {
      title:'Impacto no seu cenário',
      body:ruleMsg?.motivo||'Este ponto altera números e opções futuras.',
      detail:ruleMsg?.impacto?`Impacto estimado: ${ruleMsg.impacto}`:null,
      actions:[
        {label:'Ver alternativas',fn:`finAdvanceJourney('${journey.id}','compare');finRender()`},
        {label:'Voltar',fn:`finAdvanceJourney('${journey.id}','discover');finRender()`,ghost:true}
      ]
    };
  }
  if(stage==='compare'){
    const learned=alts.some(a=>a.badge);
    return {
      title:'Alternativas para comparar',
      body:learned
        ?'O FIN não escolhe por você. Alternativas com histórico real aparecem primeiro.'
        :'O FIN não escolhe por você. Compare e avance quando estiver pronto.',
      alternatives:alts,
      actions:[
        {label:'Registrar decisão depois',fn:`finAdvanceJourney('${journey.id}','decide');finRender()`,ghost:true}
      ]
    };
  }
  if(stage==='decide'){
    const choice=journey.choiceLabel||journey.choice;
    return {
      title:choice?'Decisão registrada':'Qual caminho você escolheu?',
      body:choice?`Você indicou: ${choice}. O FIN vai acompanhar o efeito e avaliar o resultado.`:'Selecione a alternativa que melhor representa sua escolha. A decisão continua sendo sua.',
      alternatives:choice?null:alts,
      actions:choice?[
        {label:'Iniciar acompanhamento',fn:`finAdvanceJourney('${journey.id}','track');finRender()`},
        {label:'Mudar escolha',fn:`finAdvanceJourney('${journey.id}','compare');finRender()`,ghost:true}
      ]:[
        {label:'Ainda não decidi',fn:`finAdvanceJourney('${journey.id}','compare');finRender()`,ghost:true}
      ]
    };
  }
  // track + outcome evaluation (4.6.2 — janela mínima + observação)
  const before=journey.snapshotBefore||{};
  const after=journey.snapshotAfter||finJourneySnapshot();
  const outcome=finEvaluateOutcome(before,after,journey.id,{ageDays:finJourneyAgeDays(journey),minDays:finGetOutcomePolicy().minDaysBeforeVerdict});
  journey._lastOutcome=outcome;
  const observedLines=(outcome.observed||[]).map(r=>`${r.label}: ${r.text}`);
  const actions=[
    {label:'Atualizar e reavaliar',fn:`finAdvanceJourney('${journey.id}','track',{refreshSnapshot:true});finRender()`}
  ];
  if(outcome.verdict==='worsened'){
    actions.push({label:'Reavaliar alternativas',fn:`finAdvanceJourney('${journey.id}','compare');finRender()`});
  }
  if(outcome.verdict==='observing'||outcome.tooEarly){
    actions.push({label:'Continuar observando',fn:`finAdvanceJourney('${journey.id}','track',{refreshSnapshot:true});finRender()`});
  }
  actions.push({label:'Registrar resultado e encerrar',fn:`finCloseJourney('${journey.id}',true)`});
  actions.push({label:'Encerrar sem registrar',fn:`finCloseJourney('${journey.id}',false)`,ghost:true});
  return {
    title:'Acompanhamento da decisão',
    body:journey.choiceLabel?`Escolha registrada: ${journey.choiceLabel}.`:'Acompanhe a evolução desde a descoberta deste ponto.',
    outcome,
    detail:observedLines.length?observedLines.join(' · '):'Continue registrando lançamentos; o FIN atualiza este painel automaticamente.',
    actions
  };
}
function finRenderJourneyCard(journey,ruleMsg,data){
  const content=finJourneyStageContent(journey,ruleMsg,data);
  const stages=FIN_STAGES.map(s=>{
    const m=FIN_STAGE_META[s];
    const active=s===journey.stage;
    const done=(FIN_STAGE_META[journey.stage]?.order??0)>(m.order);
    return `<span class="fin-stage-dot ${active?'active':''} ${done?'done':''}" title="${escapeHtml(m.label)}">${escapeHtml(m.label)}</span>`;
  }).join('<i class="fin-stage-sep"></i>');
  let alts='';
  if(content.alternatives){
    alts=`<div class="fin-alts">${content.alternatives.map(a=>`
      <button type="button" class="fin-alt ${a.boost>0?'fin-alt-strong':a.boost<0?'fin-alt-weak':''}" onclick="finChooseAlternative('${journey.id}','${a.id}','${String(a.label).replace(/'/g,"\\'")}')">
        <strong>${escapeHtml(a.label)}${a.badge?` <em class="fin-alt-badge">${escapeHtml(a.badge)}</em>`:''}</strong>
        <span>${escapeHtml(a.desc)}</span>
      </button>`).join('')}</div>`;
  }
  let outcomeBox='';
  if(content.outcome){
    const o=content.outcome;
    const cls=o.verdict==='improved'?'success':o.verdict==='worsened'?'danger':(o.verdict==='observing'?'info':'info');
    const obs=(o.observed||[]).map(r=>`<li><b>${escapeHtml(r.label)}</b>: ${escapeHtml(r.text)}</li>`).join('');
    const assoc=(o.associated||[]).map(r=>`<li><b>${escapeHtml(r.label)}</b>: ${escapeHtml(r.text)} <small>(${escapeHtml(r.note||'')})</small></li>`).join('');
    outcomeBox=`<div class="fin-outcome ${cls}">
      <span class="fin-eyebrow">RESULTADO OBSERVADO · ${escapeHtml(o.label)}</span>
      <p>${escapeHtml(o.summary)}</p>
      ${obs?`<div class="fin-outcome-block"><span class="fin-eyebrow">O que mudou</span><ul>${obs}</ul></div>`:''}
      ${assoc?`<div class="fin-outcome-block"><span class="fin-eyebrow">Movimentos associados ao tema</span><ul>${assoc}</ul></div>`:''}
      <div class="fin-outcome-block"><span class="fin-eyebrow">Confiança · ${escapeHtml(o.confidenceLevel||'baixa')}</span><p>${escapeHtml(o.confidenceNote||'')}</p></div>
      <small class="fin-outcome-disclaimer">${escapeHtml(o.disclaimer||'Mudanças no período podem ter outras causas além da escolha registrada.')}</small>
    </div>`;
  }
  const actions=(content.actions||[]).map(a=>`<button class="${a.ghost?'btn-ghost':'btn-primary'}" onclick="${a.fn}">${escapeHtml(a.label)}</button>`).join(' ');
  return `<div class="fin-card fin-journey stage-${journey.stage}">
    <div class="fin-journey-rail">${stages}</div>
    <span class="fin-eyebrow">CICLO DE DECISÃO · ${escapeHtml(FIN_STAGE_META[journey.stage]?.label||'')}</span>
    <h4>${escapeHtml(content.title)}</h4>
    <p>${escapeHtml(content.body)}</p>
    ${outcomeBox}
    ${content.detail?`<div class="fin-why">${escapeHtml(content.detail)}</div>`:''}
    ${alts}
    <div class="fin-actions">${actions}</div>
  </div>`;
}
function finChooseAlternative(ruleId,choiceId,choiceLabel){
  finAdvanceJourney(ruleId,'decide',{choice:choiceId,choiceLabel});
  // marca insight sem re-avançar estágio
  const logs=appData.finInsightsLog||[];
  const l=[...logs].reverse().find(x=>x.regra===ruleId);
  if(l){l.visto=true;l.acao='aprofundou';}
  else finRegisterInsight(ruleId,'info',{choice:choiceId},'decision_choice');
  saveData({refresh:false});
  finRender();
}
function finSyncJourneysWithRules(){
  // Abre jornada em discover para regras relevantes; não reabre fechadas recentemente
  try{
    const aplicaveis=obterRegrasFINAplicaveis().slice(0,3);
    aplicaveis.forEach(r=>{
      if(!r?.id)return;
      const existing=finGetJourney(r.id);
      if(existing&&existing.closed){
        // reabrir só se a regra voltou com força e passou tempo
        const hours=(Date.now()-new Date(existing.updatedAt||0).getTime())/3600000;
        if(hours<168)return; // 7 dias
        delete appData.finJourneys[r.id];
      }
      finEnsureJourney(r.id);
    });
  }catch(e){}
}

function finCharacterProfile(state){
 const profiles={
  calm:{label:'Acompanhando',message:'Tudo certo por aqui. Vou continuar acompanhando sem criar ruído.',icon:'$',voice:'Tudo certo. Continuo acompanhando.'},
  alert:{label:'Vamos organizar',message:'Calma. Vamos entender o impacto e organizar o próximo passo.',icon:'!',voice:'Calma. Vamos organizar o próximo passo.'},
  analyze:{label:'Analisando',message:'Encontrei algo que merece uma olhada antes da próxima decisão.',icon:'⌕',voice:'Encontrei algo que merece uma olhada.'},
  opportunity:{label:'Oportunidade',message:'Encontrei um espaço para comparar caminhos e fazer o dinheiro trabalhar melhor.',icon:'↗',voice:'Há uma oportunidade para comparar caminhos.'},
  celebrate:{label:'Boa conquista',message:'Boa! Esse movimento aproximou você de uma situação financeira mais forte.',icon:'★',voice:'Boa conquista! Isso fortaleceu seu cenário.'},
  goal:{label:'Foco na meta',message:'Sua meta está no radar. Vamos ajustar o caminho sem perder o que importa.',icon:'◎',voice:'Sua meta está no radar. Vamos ajustar o caminho.'}
 };
 return profiles[state]||profiles.calm;
}
function finCharacterState(data){
 // Estado agora vem do Decision Assistant (relevância + contexto), não só da regra bruta
 try{
  const decision=finDecisionForCurrentScenario();
  window._finLastDecision=decision;
  return decision.state||'calm';
 }catch(e){
  // fallback legado
  const ev=window.finPendingEvent;
  if(ev){
   if(ev.id==='tx_investment'||ev.id==='tx_amortization')return 'celebrate';
   if(ev.id==='tx_budget_pressure')return ev.level==='warning'?'alert':'analyze';
   return ev.level==='warning'||ev.level==='danger'?'alert':'analyze';
  }
  const id=data?.rec?.id;
  if(id==='cash_risk'||id==='audit_duplicate'||id==='budget_pending')return 'alert';
  if(id==='goal_late')return 'goal';
  if(id==='amortization_opportunity'||id==='free_cash')return 'opportunity';
  if(id==='card_pressure'||id==='financing_interest')return 'analyze';
  return 'calm';
 }
}

/* FIN 4.1.1 — animações de personagem + voz opcional */
window._finBlinkTimer=null;
window._finLastSpokenState=null;
window._finLastState=null;

function finStopBlink(){
 if(window._finBlinkTimer){clearInterval(window._finBlinkTimer);window._finBlinkTimer=null}
 document.querySelectorAll('.fin-character').forEach(el=>el.classList.remove('is-blinking'));
}
function finStartBlink(){
 finStopBlink();
 window._finBlinkTimer=setInterval(()=>{
  const els=document.querySelectorAll('.fin-character.state-calm');
  if(!els.length)return;
  els.forEach(el=>el.classList.add('is-blinking'));
  setTimeout(()=>els.forEach(el=>el.classList.remove('is-blinking')),140);
 },4200+Math.random()*1800);
}
function finSpeak(text){
 if(!window.speechSynthesis||!text)return;
 const prefs=appData?.finConfig||{};
 if(!prefs.voz)return;
 try{
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang='pt-BR';u.rate=1.05;u.pitch=1.05;u.volume=0.85;
  const voices=window.speechSynthesis.getVoices();
  const br=voices.find(v=>/pt-BR|Portuguese.*Brazil/i.test((v.lang||'')+(v.name||'')));
  if(br)u.voice=br;
  window.speechSynthesis.speak(u);
 }catch(e){}
}
function renderFINCharacter(state,data){
 const profile=finCharacterProfile(state);
 const stateChanged=window._finLastState!==state;
 window._finLastState=state;

 ['finPanelCharacter','finFabCharacter'].forEach(id=>{
  const el=$(id); if(!el)return;
  const wasMini=el.classList.contains('fin-character-mini')||id==='finFabCharacter';
  el.className=`fin-character ${wasMini?'fin-character-mini ':''}state-${state}`;
  if(stateChanged){
   el.classList.remove('is-entering');
   void el.offsetWidth;
   el.classList.add('is-entering');
   setTimeout(()=>el.classList.remove('is-entering'),400);
  }
  const coin=el.querySelector('.fin-character-coin'); if(coin)coin.textContent=profile.icon;
 });

 const fab=$('finFab');
 if(fab)fab.classList.toggle('has-urgent',state==='alert');

 if(state==='calm')finStartBlink(); else finStopBlink();

 const label=$('fin-character-label'),message=$('fin-character-message');
 if(label)label.textContent=profile.label;
 if(message)message.textContent=profile.message;

 const dec=window._finLastDecision;
 const maySpeak=stateChanged && state!=='calm' && window._finLastSpokenState!==state && dec && (dec.mode==='normal'||dec.mode==='urgent');
 if(maySpeak){
  window._finLastSpokenState=state;
  finSpeak(profile.voice);
 }
}
function finRender(){
 const box=$('fin-content'); if(!box)return;
 renderPreferenciasFIN();
 const tab=finCurrentTab();
 const data=finInsightGlobal();
 $('fin-context-label').textContent=finContextLabel(tab);

 // Decision Assistant decide se/quanto falar
 const decision=finDecisionForCurrentScenario();
 window._finLastDecision=decision;
 const finState=decision.state||'calm';
 renderFINCharacter(finState,data);

 const html=[];
 const mode=decision.mode||'silence';
 const depth=decision.depth||'none';

 // Evento só aparece se o Decision Assistant não mandou silêncio
 if(window.finPendingEvent && mode!=='silence'){
  const ev=window.finPendingEvent;
  const depthNote=depth==='brief'?' (resumo)':depth==='deep'?'':'';
  html.push(`<div class="fin-card ${escapeHtml(ev.level||'info')} fin-event"><span class="fin-eyebrow">ACABEI DE ANALISAR${depthNote}</span><h4>Esse lançamento mudou seu cenário</h4><p>${escapeHtml(ev.text)}</p><div class="fin-actions"><button class="btn-ghost" onclick="window.finPendingEvent=null;finRender()">Entendi</button></div></div>`);
 }

 const profile=finCharacterProfile(finState);
 const decisionHint=mode==='silence'
  ?'Nada relevante o suficiente para interromper agora.'
  :mode==='soft'
  ?'Sinal discreto — abra se quiser aprofundar.'
  :mode==='urgent'
  ?'Prioridade alta — vale olhar com atenção.'
  :'FIN adapta sua leitura ao que está acontecendo agora.';
 html.push(`<div class="fin-character-message state-${finState}"><div><span class="fin-character-label" id="fin-character-label">${escapeHtml(profile.label)}</span><strong id="fin-character-message">${escapeHtml(profile.message)}</strong></div><small>${escapeHtml(decisionHint)}</small></div>`);

 // Ciclo de decisão: sincroniza jornadas e renderiza estágio atual
 finSyncJourneysWithRules();
 const journeys=finActiveJourneys();
 const primaryId=decision.primary?.id;
 const primaryJourney=primaryId?finGetJourney(primaryId):null;
 const journeyToShow=(primaryJourney&&!primaryJourney.closed)?primaryJourney:(journeys[0]||null);

 if(mode!=='silence' && journeyToShow){
  // Conteúdo do ciclo substitui cards genéricos para o ponto principal
  const ruleMsg=decision.primary?.mensagem||data.cards?.find(c=>c.ruleId===journeyToShow.id)||{titulo:data.rec?.titulo,problema:data.rec?.problema,motivo:data.rec?.motivo,impacto:data.rec?.impacto};
  // Se decision.primary.mensagem for objeto da regra
  const msg=decision.primary?.mensagem||ruleMsg;
  html.push(finRenderJourneyCard(journeyToShow,msg,data));

  // Outras jornadas ativas (resumo)
  journeys.filter(j=>j.id!==journeyToShow.id).slice(0,1).forEach(j=>{
   const st=FIN_STAGE_META[j.stage]?.label||j.stage;
   html.push(`<div class="fin-card"><span class="fin-eyebrow">OUTRO CICLO EM ANDAMENTO</span><h4>${escapeHtml(j.id)}</h4><p>Estágio: <b>${escapeHtml(st)}</b>${j.choiceLabel?` · Escolha: ${escapeHtml(j.choiceLabel)}`:''}</p><div class="fin-actions"><button class="btn-ghost" onclick="window._finFocusJourney='${j.id}';finRender()">Abrir ciclo</button></div></div>`);
  });
 } else if(mode!=='silence'){
  // Fallback: cards clássicos quando não há jornada
  const maxCards=depth==='brief'?1:2;
  data.cards.slice(0,maxCards).forEach(c=>{
   const showWhy=depth!=='brief' && c.why;
   const showActions=depth!=='brief';
   html.push(`<div class="fin-card ${c.level}"><span class="fin-eyebrow">${escapeHtml(c.ey)}</span><h4>${escapeHtml(c.title)}</h4><p>${escapeHtml(c.text)}</p>${showWhy?`<div class="fin-why"><b>Por que isso importa?</b> ${escapeHtml(c.why)}</div>`:''}${showActions&&c.action?`<div class="fin-actions"><button onclick="${c.action}">${escapeHtml(c.label||'Ver')}</button>${c.ruleId?`<button class="btn-ghost" onclick="finMarkInsight('${c.ruleId}','ignorado')">Já vi</button>`:''}</div>`:''}</div>`);
  });
 }

 // Educação e visão rápida: só em normal/urgent
 if(mode==='normal'||mode==='urgent'){
  const teach=finTeaching(tab,data);
  html.push(`<div class="fin-card info"><span class="fin-eyebrow">EDUCAÇÃO FINANCEIRA</span><h4>${escapeHtml(teach.title)}</h4><p>${escapeHtml(teach.text)}</p>${teach.action?`<div class="fin-actions"><button onclick="${teach.action}">${escapeHtml(teach.label||'Explorar')}</button></div>`:''}</div>`);
  html.push(`<div class="fin-card"><span class="fin-eyebrow">VISÃO RÁPIDA</span><h4>Seu cenário atual</h4><p>Fluxo do mês: <b>${brl(data.at.fluxoLivre||0)}</b> · Patrimônio líquido: <b>${brl(data.nw.liquido||0)}</b> · Reserva: <b>${data.cob.toFixed(1)} meses</b>.</p><small class="muted">Esses números descrevem o cenário atual; o FIN usa eles para ajudar você a avaliar alternativas.</small></div>`);
 } else if(mode==='silence'){
  // Mesmo em silêncio, jornadas em acompanhamento podem aparecer
  const tracking=journeys.filter(j=>j.stage==='track').slice(0,1);
  if(tracking.length){
   const j=tracking[0];
   const msg={titulo:'Acompanhamento',problema:'',motivo:'',impacto:''};
   html.push(finRenderJourneyCard(j,msg,data));
  } else {
   html.push(`<div class="fin-card"><span class="fin-eyebrow">MODO SILENCIOSO</span><h4>Acompanhando sem ruído</h4><p>Nenhum ponto atingiu o limiar de relevância agora. O FIN continua observando histórico, metas e projeção.</p><small class="muted">Score de decisão: ${(decision.score||0).toFixed(0)} · Você pode perguntar a qualquer momento.</small></div>`);
  }
 }

 box.innerHTML=html.join('');
 const badge=$('finBadge');
 const showBadge=mode==='urgent'||mode==='normal'&&data.cards.some(c=>c.level==='danger'||c.level==='warning');
 badge?.classList.toggle('hidden',!showBadge);
}
function toggleFIN(force){finOpen=typeof force==='boolean'?force:!finOpen; const p=$('finPanel'); if(!p)return; p.classList.toggle('open',finOpen);p.setAttribute('aria-hidden',String(!finOpen)); if(finOpen)finRender();}
function finExplainQuestion(q,d){
 const regras=(()=>{try{return obterRegrasFINAplicaveis()||[]}catch(e){console.warn('[FIN] Falha ao carregar regras:',e);return[]}})();
 if(/posso gastar|quanto posso gastar|gastar|compra/.test(q)){
   const margem=Math.max(0,Number(d.at.fluxoLivre||0));
   return {text:`Com os dados registrados, sua margem disponível no mês está em ${brl(margem)}. Isso é uma referência, não uma autorização de gasto. Para uma compra relevante, compare também o efeito nos próximos 90 dias.`,rule:regras[0]?.id};
 }
 if(/sobra|resultado|saldo do mês|mês negativo|m[eê]s positivo/.test(q)){
   return {text:`Sua sobra no mês selecionado é de ${brl(d.at.resultado||0)}. A projeção dos próximos 90 dias usa esse resultado como ponto de partida e soma os fluxos futuros conhecidos.`,rule:null};
 }
 if(/proje[cç][aã]o|30 dias|60 dias|90 dias|pr[oó]ximos meses/.test(q)){
   const f=d.f||projectFutureCash(3), labels=(f.items||[]).map(x=>`${x.label}: ${brl(x.saldo)}`).join(' · ');
   return {text:`Na projeção atual, os próximos meses ficam assim: ${labels||'ainda não há dados futuros suficientes'}. Valores positivos indicam caixa projetado disponível; valores negativos indicam pressão de caixa.`,rule:null};
 }
 if(/reserva|emerg/.test(q)) return {text:`Sua reserva cobre aproximadamente ${d.cobertura.toFixed(1)} meses da média de despesas. A referência configurada no FIN é ${Number(d.config.reservaMeses||6).toFixed(1)} meses.`,rule:'reserve_low'};
 if(/patrim|quanto tenho|liquido/.test(q)) return {text:`Seu patrimônio líquido calculado é ${brl(d.nw.liquido||0)}. Ele representa os ativos reconhecidos pelo motor menos os passivos; isso é diferente do dinheiro disponível para uso imediato.`,rule:null};
 if(/cart[aã]o|fatura/.test(q)) return {text:`O cartão é tratado pelo valor da fatura mensal. O pagamento liquida a obrigação e reduz o caixa, sem contar novamente como uma nova despesa.`,rule:'card_pressure'};
 if(/meta|objetivo/.test(q)) return {text:`O FIN considera valor acumulado, objetivo, prazo e ritmo de aporte. Se uma meta estiver atrasada, ele pode sugerir recalibrar o prazo ou o aporte.`,rule:'goal_late'};
 if(/financ|amort/.test(q)) return {text:`No financiamento, o FIN compara custo efetivo, juros futuros, saldo e efeito da amortização sobre prazo ou parcela.`,rule:'financing_interest'};
 if(/invest|aplica|rentab|rendimento|cdi|lci|lca|cdb|tesouro/.test(q)){const f=d.f||projectFutureCash(3);return {text:`O motor projeta os investimentos pela rentabilidade cadastrada e considera aportes e resgates futuros. A estimativa atual de rendimento em 90 dias é ${brl(f.totalRendimento||0)}.`,rule:null};}
 if(/por que|porque|motivo|recomenda|sugest|o que voc[eê] faria|vale a pena/.test(q) && regras[0]){const m=regras[0].mensagem;return {text:`Minha recomendação principal é: ${m.titulo}. ${m.motivo} Uma possibilidade é: ${m.acao}`,rule:regras[0].id};}
 return {text:`Estou acompanhando seu cenário. Hoje, sua sobra é ${brl(d.at.resultado||0)}, sua reserva cobre ${d.cobertura.toFixed(1)} meses e o patrimônio líquido é ${brl(d.nw.liquido||0)}. Você pode me perguntar sobre gastos, projeções, investimentos, reserva, cartões ou financiamentos.`,rule:null};
}
function perguntarFIN(){
 const input=$('finQuestion'),answer=$('fin-answer');
 if(!input||!answer)return;
 const q=(input.value||'').trim().toLowerCase();
 if(!q){answer.innerHTML='<div><b>FIN:</b> Escreva sua pergunta para eu analisar seu cenário.</div>';answer.classList.remove('hidden');return;}
 try{
   const d=finDataContext();
   const r=finExplainQuestion(q,d);
   const safeRule=r.rule?String(r.rule).replace(/[^a-zA-Z0-9_-]/g,''):'';
   answer.innerHTML=`<div><b>FIN:</b> ${escapeHtml(r.text)}</div>${safeRule&&safeRule!=='stable'?`<button class=\"btn-ghost mt-10\" onclick=\"finMarkInsight('${safeRule}','aprofundou')\">Entendi</button>`:''}`;
   answer.classList.remove('hidden');
   answer.scrollIntoView({behavior:'smooth',block:'nearest'});
 }catch(err){
   console.error('[FIN] Falha ao responder pergunta:',err);
   answer.innerHTML='<div><b>FIN:</b> Não consegui concluir essa leitura agora. Tente novamente; seus dados continuam preservados.</div>';
   answer.classList.remove('hidden');
 }
}
function switchTab(tab,btn){
  try{window.dispatchEvent(new CustomEvent('financaspro:tabchange',{detail:{tab}}));}catch(e){}
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
  const target=$('tab-'+tab);
  if(!target)return;
  target.classList.add('active');
  if(btn)btn.classList.add('active');
  try{
    if(tab==='dashboard')atualizarDashboard();
    else if(tab==='orcamento')renderizarOrcamento();
    else if(tab==='patrimonio')renderizarPatrimonio();
    else if(tab==='cartoes')renderizarCartoes();
    else if(tab==='metas')renderizarMetas();
    else if(tab==='extrato')renderizarExtrato();
    else if(tab==='simulador')renderizarSimuladorAtivo();
  }catch(err){
    console.error('[FinançasPRO] Falha ao abrir a aba '+tab,err);
    target.innerHTML=`<div class="error-panel"><b>Não foi possível carregar esta seção.</b><p>O conteúdo foi preservado. Recarregue a página ou tente novamente.</p><button class="btn-sm" onclick="switchTab('${tab}',document.querySelector('.nav-btn.active'))">Tentar novamente</button></div>`;
  }
  if(target) target.scrollTop=0;
  finRender();
  window.scrollTo({top:0,left:0,behavior:'auto'});
}

function switchToMetas(){goToTab('metas')}
function switchToSimulador(){goToTab('simulador')}
function chartOpts(money){return{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:cssVar('--muted')}}},scales:{x:{grid:{color:'#ffffff0d'},ticks:{color:cssVar('--muted')}},y:{grid:{color:'#ffffff0d'},ticks:{color:cssVar('--muted'),callback:v=>money?brl(v):brl(v)}}}}}
function budgetKey(y,m,cat){return `${monthKey(y,m)}::${cat.toLowerCase()}`}
function getBudgetState(y,m,cat){return window.FinancialEngine?FinancialEngine.budgetState(appData,y,m,cat):{}}
function saveBudgetState(y,m,cat,patch){const key=budgetKey(y,m,cat);appData.orcamentoControle[key]={...(appData.orcamentoControle[key]||{}),...patch,atualizadoEm:iso(hoje())};reconcileBudgetCardPayments(y,m);saveData();requestRefresh('budget-change')}
function renderizarOrcamento(){
 const {year,month}=dashboardYM(),tbody=$('table-orcamento').querySelector('tbody');tbody.innerHTML='';let totP=0,totR=0,totAnt=0,totAtual=0,totComp=0;
 Object.entries(appData.orcamento).forEach(([cat,teto])=>{
   const safeCat=String(cat).replace(/'/g,"\\'");
   const r=getMonthTransactions(year,month).filter(t=>t.tipo==='despesa'&&String(t.categoria).toLowerCase()===cat.toLowerCase()).reduce((s,t)=>s+transactionAmount(t),0);
   const st=getBudgetState(year,month,cat),pago=Number(st.pagoMes)||0,pendAnterior=Number(st.pendenteAnterior)||0,pendente=Math.max(0,pendAnterior+r-pago),compromisso=pendAnterior+Math.max(0,r-pago),util=Number(teto)?r/Number(teto)*100:0;
   appData.orcamentoControle[budgetKey(year,month,cat)]={...(appData.orcamentoControle[budgetKey(year,month,cat)]||{}),realizadoMes:r,pagoMes:pago,pendenteMes:pendente,pendenteAcumulado:pendente};
   totP+=Number(teto)||0;totR+=r;totAnt+=pendAnterior;totAtual+=pendente;totComp+=compromisso;
   const status=pendente>0?'Pendente':util>=100?'Acima do orçamento':util>=80?'Atenção':'Em dia';
   const cls=pendente>0||util>=100?'danger':util>=80?'warning':'success';
   tbody.innerHTML+=`<tr><td><div class="budget-category-cell"><b>${escapeHtml(cat)}</b><small>${pago>0?brl(pago)+' pago':'Nenhum pagamento registrado'}</small></div></td><td>${brl(teto)}</td><td>${brl(r)}</td><td><b>${brl(compromisso)}</b></td><td><div class="budget-util"><span>${util.toFixed(1)}%</span><i style="width:${Math.min(100,util)}%"></i></div></td><td><span class="status-pill ${cls}">${status}</span></td><td><button class="btn-sm" onclick="openOrcamentoDetalhes('${safeCat}')">＋ Detalhes</button> <button class="btn-sm" onclick="openOrcamentoModal('${safeCat}')">Editar</button></td></tr>`;
 });
 $('orc-total-planejado').textContent=brl(totP);$('orc-total-realizado').textContent=brl(totR);$('orc-total-anterior').textContent=brl(totAnt);$('orc-total-compromisso').textContent=brl(totComp);
 if(Object.keys(appData.orcamentoControle||{}).length) saveData({refresh:false});
}
function openOrcamentoDetalhes(cat){
 const {year,month}=dashboardYM(),st=getBudgetState(year,month,cat),r=getMonthTransactions(year,month).filter(t=>t.tipo==='despesa'&&String(t.categoria).toLowerCase()===cat.toLowerCase()).reduce((sum,t)=>sum+transactionAmount(t),0);
 const anterior=Number(st.pendenteAnterior)||0,pago=Number(st.pagoMes)||0,pendente=Math.max(0,anterior+r-pago),compromisso=anterior+Math.max(0,r-pago);
 window._orcDetalhesCategoria=cat;
 $('orcDetalhesTitulo').textContent=cat;$('orcDetalhesContexto').textContent=`${monthLabel(year,month)} · Planejado: ${brl(appData.orcamento[cat]||0)} · Realizado: ${brl(r)}`;
 $('orcDetalhesPago').textContent=brl(pago);$('orcDetalhesAnterior').textContent=brl(anterior);$('orcDetalhesPendente').textContent=brl(pendente);$('orcDetalhesCompromisso').textContent=brl(compromisso);
 $('orcDetalhesValorPago').value=pago.toFixed(2);$('orcDetalhesPagoIntegral').checked=pago>=anterior+r&&anterior+r>0;
 $('orcDetalhesModal').classList.add('open');
}
function closeOrcamentoDetalhes(){window._orcDetalhesCategoria=null;$('orcDetalhesModal').classList.remove('open')}
function salvarOrcamentoDetalhes(){
 const cat=window._orcDetalhesCategoria;if(!cat)return;
 const {year,month}=dashboardYM(),r=getMonthTransactions(year,month).filter(t=>t.tipo==='despesa'&&String(t.categoria).toLowerCase()===cat.toLowerCase()).reduce((sum,t)=>sum+transactionAmount(t),0),anterior=getBudgetState(year,month,cat).pendenteAnterior,total=anterior+r;
 const pagoIntegral=$('orcDetalhesPagoIntegral').checked,pago=pagoIntegral?total:Math.max(0,Math.min(total,Number($('orcDetalhesValorPago').value)||0));
 saveBudgetState(year,month,cat,{realizadoMes:r,pagoMes:pago,pendenteMes:Math.max(0,total-pago),pendenteAcumulado:Math.max(0,total-pago)});
 closeOrcamentoDetalhes();
}
function openOrcamentoModal(categoria=null){editingOrcCategoria=categoria;$('orcModal').classList.add('open');$('orcModalTitle').textContent=categoria?'Editar orçamento':'Novo orçamento';$('orcCategoria').value=categoria||'';$('orcCategoria').disabled=false;$('orcValor').value=categoria?(appData.orcamento[categoria]||0):''}
function closeOrcamentoModal(){editingOrcCategoria=null;$('orcModal').classList.remove('open')}
function handleSaveOrcamento(e){e.preventDefault();const cat=$('orcCategoria').value.trim(),valor=Math.max(0,Number($('orcValor').value)||0);if(!cat)return;const old=editingOrcCategoria;if(old&&old!==cat){appData.orcamento[cat]=valor;delete appData.orcamento[old];appData.categorias=(appData.categorias||[]).map(c=>c.toLowerCase()===old.toLowerCase()?cat:c);appData.transacoes.forEach(t=>{if(String(t.categoria).toLowerCase()===old.toLowerCase())t.categoria=cat})}else appData.orcamento[cat]=valor;if(!appData.categorias.includes(cat))appData.categorias.push(cat);saveData();closeOrcamentoModal();refreshAll()}
function excluirOrcamento(cat){confirmarAcao(`Excluir o orçamento de ${cat}? Os lançamentos serão preservados.`,()=>{delete appData.orcamento[cat];appData.categorias=(appData.categorias||[]).filter(c=>c.toLowerCase()!==cat.toLowerCase());saveData();refreshAll()})}

function calcularTIRFinanciamento(p){const f=p?.financiamento;if(!f||!f.parcelaMensal||!f.parcelasTotal)return 0;const n=Math.max(1,Number(f.parcelasTotal)-(Number(f.parcelasPagas)||0)),pv=Math.max(0,Number(p.valor)||0),pm=Number(f.parcelaMensal)||0;let lo=0,hi=1;for(let i=0;i<80;i++){const r=(lo+hi)/2;let npv=-pv;for(let k=1;k<=n;k++)npv+=pm/Math.pow(1+r,k);if(npv>0)lo=r;else hi=r}return Math.pow(1+(lo+hi)/2,12)-1}
function simularFinanciamento(p, opts={}){const f=p?.financiamento;if(!f)return null;if(window.FinancialEngine?.simulateFinancing)return FinancialEngine.simulateFinancing(f,{...opts,saldoInicial:opts.saldoInicial??p.valor??f.saldoDevedor});return null}

function calcularFinanciamentoDetalhes(p){
 const f=p?.financiamento;if(!f)return null;
 const st=window.FinancialEngine?.financingState(p); const saldo=st?.saldo??Math.max(0,Number(p.valor)||Number(f.saldoDevedor)||0), taxa=st?.taxaMensal??monthlyRateFromAnnual(f.taxaJurosAnual), parcela=st?.parcela??Math.max(0,Number(f.parcelaMensal)||0), rest=st?.rest??Math.max(0,Number(f.parcelasTotal||0)-Number(f.parcelasPagas||0));
 const sim=st?.sim||simularFinanciamento(p); const juros=st?.juros??sim?.juros??0; const jurosPagos=appData.transacoes.filter(t=>String(t.financiamentoId)===String(p.id)&&t.status!=='Cancelada').reduce((s,t)=>s+Number(t.juros||0),0); const tir=calcularTIRFinanciamento(p); const totalRestante=Number.isFinite(juros)?saldo+juros:saldo;
 return {saldo,taxa,parcela,rest,juros,jurosPagos,meses:sim?.meses??rest,tir,totalRestante,valorBem:Number(f.valorBem)||0,valorFinanciado:Number(f.valorFinanciado)||0,parcelasPagas:Number(f.parcelasPagas)||0,parcelasTotal:Number(f.parcelasTotal)||0,sistema:sim?.sistema||'price'};
}
function simularAmortizacaoExtra(p, extra, objetivo){
 const d=calcularFinanciamentoDetalhes(p); if(!d)return null; const valorExtra=Math.max(0,Number(extra)||0); if(valorExtra<=0)return null;
 const saldoNovo=Math.max(0,d.saldo-valorExtra), parcelasRest=d.rest;
 const base=simularFinanciamento(p);
 let novo;
 if(objetivo==='parcela'){
   const sistema=String(p.financiamento.sistemaAmortizacao||'price').toLowerCase();
   let novaParcela;
   if(parcelasRest<=0){novaParcela=0;} else if(sistema==='sac'){
     novaParcela=(saldoNovo/parcelasRest)+(saldoNovo*d.taxa);
   } else if(d.taxa>0){
     novaParcela=saldoNovo*d.taxa/(1-Math.pow(1+d.taxa,-parcelasRest));
   } else novaParcela=saldoNovo/parcelasRest;
   const temp={...p,valor:saldoNovo,financiamento:{...p.financiamento,parcelaMensal:novaParcela,parcelasPagas:p.financiamento.parcelasPagas}};
   novo=simularFinanciamento(temp,{parcela:novaParcela,parcelasRestantes:parcelasRest,saldoInicial:saldoNovo});
   return {objetivo,extra:valorExtra,base,novo,novaParcela,mesesEconomizados:Math.max(0,(base.meses||0)-parcelasRest)};
 }
 const temp={...p,valor:saldoNovo}; const sistema=String(p.financiamento.sistemaAmortizacao||'price').toLowerCase(); const amortBase=sistema==='sac'?(Number(d.saldo)>0?Number(d.saldo)/Math.max(1,Number(d.rest)):0):undefined; novo=simularFinanciamento(temp,{saldoInicial:saldoNovo,parcela:d.parcela,parcelasRestantes:parcelasRest,sacAmortizationBase:amortBase});
 return {objetivo:'prazo',extra:valorExtra,base,novo,novaParcela:d.parcela,mesesEconomizados:Math.max(0,(base.meses||0)-(novo.meses||0))};
}
function aplicarAmortizacaoExtra(t){
 const p=appData.patrimonio.find(x=>String(x.id)===String(t.financiamentoId)); if(!p?.financiamento)return false;
 const valor=Math.min(Math.max(0,Number(t.valorTotal)||0),Math.max(0,Number(p.valor)||0)); if(valor<=0)return false;
 const antes=calcularFinanciamentoDetalhes(p); const objetivo=t.amortizacaoObjetivo||'prazo'; const resultado=simularAmortizacaoExtra(p,valor,objetivo); t.parcelaAnterior=p.financiamento.parcelaMensal;
 p.valor=Math.max(0,Number(p.valor)-valor); p.valorAtual=p.valor; p.financiamento.saldoDevedor=p.valor; p.financiamento.amortizacoesExtras=(p.financiamento.amortizacoesExtras||0)+valor;
 if(objetivo==='parcela'&&resultado?.novaParcela>0) p.financiamento.parcelaMensal=resultado.novaParcela;
 if(objetivo==='prazo'){
   const novoDetalhes=calcularFinanciamentoDetalhes(p); if(novoDetalhes){p.financiamento.parcelasTotaisEstimadas=novoDetalhes.rest;p.financiamento.parcelasTotal=Math.max(Number(p.financiamento.parcelasPagas||0),Number(p.financiamento.parcelasPagas||0)+Number(novoDetalhes.rest||0));}
 }
 t.juros=0; t.amortizacao=valor; t.antesSaldoDevedor=antes?.saldo||0; t.depoisSaldoDevedor=p.valor; t.economiaJurosEstimada=resultado?.base&&resultado?.novo&&Number.isFinite(resultado.base.juros)&&Number.isFinite(resultado.novo.juros)?Math.max(0,resultado.base.juros-resultado.novo.juros):0; t.mesesReduzidos=resultado?.mesesEconomizados||0; return true;
}
function abrirFinanciamentoDetalhes(id){const p=appData.patrimonio.find(x=>String(x.id)===String(id)),d=calcularFinanciamentoDetalhes(p);if(!p||!d)return;const prog=d.parcelasTotal?Math.min(100,d.parcelasPagas/d.parcelasTotal*100):0;$('fin-detalhes-titulo').textContent=p.nome;$('fin-detalhes-conteudo').innerHTML=`<div class="fin-detail-grid"><div><span>Saldo devedor</span><strong>${brl(d.saldo)}</strong></div><div><span>Parcela atual</span><strong>${brl(d.parcela)}</strong></div><div><span>Taxa efetiva anual</span><strong>${Number(p.financiamento.taxaJurosAnual||0).toFixed(2)}%</strong></div><div><span>Sistema</span><strong>${d.sistema.toUpperCase()}</strong></div><div><span>Parcelas restantes</span><strong>${d.rest}</strong></div><div><span>Juros futuros restantes</span><strong>${Number.isFinite(d.juros)?brl(d.juros):'—'}</strong></div><div><span>Compromisso restante</span><strong>${Number.isFinite(d.totalRestante)?brl(d.totalRestante):'—'}</strong></div><div><span>Juros já pagos</span><strong>${brl(d.jurosPagos)}</strong></div></div><div class="progress mt-20"><i style="width:${prog}%"></i></div><p class="muted">${prog.toFixed(0)}% das parcelas já foram pagas.</p><div class="amortizacao-box"><h4>Simulador de amortização</h4><p class="muted">Simule uma amortização extraordinária e escolha entre reduzir o prazo ou a parcela.</p><div class="inline-form"><input id="fin-extra-amort" type="number" min="0" step="10" value="1000" placeholder="Valor da amortização"><select id="fin-extra-objetivo"><option value="prazo">Reduzir prazo</option><option value="parcela">Reduzir valor da parcela</option></select><button class="btn-primary" onclick='simularAmortizacaoDetalhes(${JSON.stringify(p.id)})'>Simular</button></div><div id="fin-amort-resultado" class="analysis-box mt-10"></div></div>`;$('financiamentoDetalhesModal').classList.add('open')}
function fecharFinanciamentoDetalhes(){$('financiamentoDetalhesModal').classList.remove('open')}
function simularAmortizacaoDetalhes(id){const p=appData.patrimonio.find(x=>String(x.id)===String(id));if(!p)return;const extra=Math.max(0,Number($('fin-extra-amort').value)||0),objetivo=$('fin-extra-objetivo').value;const r=simularAmortizacaoExtra(p,extra,objetivo);if(!r)return;const baseJ=Number.isFinite(r.base?.juros)?r.base.juros:Infinity,newJ=Number.isFinite(r.novo?.juros)?r.novo.juros:Infinity;let html=`<div>Saldo após amortização: <b>${brl(Math.max(0,(Number(p.valor)||0)-extra))}</b></div><div>Economia estimada de juros: <b>${Number.isFinite(baseJ)&&Number.isFinite(newJ)?brl(Math.max(0,baseJ-newJ)):'—'}</b></div>`;if(objetivo==='prazo'){html+=`<div>Prazo restante estimado: <b>${Number.isFinite(r.novo?.meses)?r.novo.meses:'—'} meses</b></div><div>Redução estimada: <b>${r.mesesEconomizados} meses</b></div>`}else{html+=`<div>Nova parcela estimada: <b>${brl(r.novaParcela||0)}</b></div><div>Redução mensal estimada: <b>${brl(Math.max(0,(p.financiamento.parcelaMensal||0)-(r.novaParcela||0)))}</b></div>`}$('fin-amort-resultado').innerHTML=html}
function renderizarPatrimonio(){
 const nw=calculateNetWorth(),liq=calculateLiquidAssets(),reserva=calculateEmergencyReserve(),avg=avgExpenses();
 $('pat-bruto').textContent=brl(nw.bruto);$('pat-dividas').textContent=brl(nw.dividas);$('pat-liquido').textContent=brl(nw.liquido);$('pat-investivel').textContent=brl(calculateInvestableAssets());$('pat-liquidos-val').textContent=brl(liq);$('pat-liq-meses').textContent=avg.media?(reserva/avg.media).toFixed(1)+' meses de reserva':'Sem histórico';
 $('pat-juros-futuros').textContent=brl(nw.jurosFuturos||0);
 let finCount=0;const resumo=[];
 appData.patrimonio.filter(p=>p.classe==='Passivo'&&p.financiamento).forEach(p=>{const d=calcularFinanciamentoDetalhes(p);finCount++;resumo.push(`<div class="fin-summary-item"><div><b>${escapeHtml(p.nome)}</b><span>Principal ${brl(d.saldo)} · ${d.rest} parcelas · Compromisso ${brl(d.totalRestante)}</span></div><strong>${Number.isFinite(d.juros)?brl(d.juros):'—'}</strong><small>Juros futuros restantes</small><button class="btn-sm" onclick='abrirFinanciamentoDetalhes(${JSON.stringify(p.id)})'>Detalhes</button></div>`)});
 $('pat-passivo-resumo').innerHTML=resumo.join('')||'<div class="empty-state">Nenhum financiamento cadastrado.</div>';if($('pat-financiamentos-count'))$('pat-financiamentos-count').textContent=finCount+' '+(finCount===1?'cadastrado':'cadastrados');
 renderizarComposicaoPatrimonio('Ativo','chartPatrimonioAtivos','patrimonio-ativos-legenda');
 renderizarComposicaoPatrimonio('Passivo','chartPatrimonioPassivos','patrimonio-passivos-legenda');
 const tbody=$('table-patrimonio')?.querySelector('tbody');
 if(tbody) tbody.innerHTML=appData.patrimonio.map(p=>`<tr><td><b>${escapeHtml(p.nome)}</b></td><td>${escapeHtml(p.classe)}</td><td>${escapeHtml(p.categoria)}${String(p.categoria||'').toLocaleLowerCase('pt-BR').includes('imó')?`<small class="muted">Aquisição ${brl(p.valorAquisicao||0)} · Atual ${brl(p.valorAtual||p.valor||0)}${p.geraRenda?` · Aluguel ${brl(p.rendaMensal||0)}/mês`:''}</small>`:''}</td><td>${brl(p.financiamento?(p.financiamento.saldoDevedor??p.valor??p.financiamento.valorFinanciado): (p.valorAtual??p.valor))}</td><td>${p.liquidez}</td><td>${p.classe==='Ativo'?(p.investivel?'Sim':'Não'):'—'}</td><td>${p.financiamento?`<button class="btn-sm" onclick='abrirFinanciamentoDetalhes(${JSON.stringify(p.id)})'>Detalhes</button> ` :''}<button class="btn-sm" onclick='openPatrimonioModal(${JSON.stringify(p.id)})'>Editar</button> <button class="btn-danger" onclick='excluirPatrimonio(${JSON.stringify(p.id)})'>Excluir</button></td></tr>`).join('')||'<tr><td colspan="7">Nenhum item cadastrado.</td></tr>';
}
function renderizarComposicaoPatrimonio(classe,canvasId,legendId){
 const canvas=$(canvasId),legend=$(legendId);if(!canvas)return;
 const grupos={};appData.patrimonio.filter(p=>p.classe===classe&&Number(p.valor)>0).forEach(p=>{const key=p.categoria||'Outros';grupos[key]=(grupos[key]||0)+Number(p.valorAtual??p.valor??0)});
 const labels=Object.keys(grupos),data=Object.values(grupos),colors=chartPalette(labels);
 if(classe==='Ativo'){if(chartPatrimonioAtivosInstance)chartPatrimonioAtivosInstance.destroy();}else{if(chartPatrimonioPassivosInstance)chartPatrimonioPassivosInstance.destroy();}
 if(!labels.length){canvas.style.display='none';if(legend)legend.innerHTML='<div class="chart-empty">Nenhum item cadastrado.</div>';return;}
 if(typeof Chart==='undefined'){canvas.style.display='none';if(legend)legend.innerHTML='<div class="chart-empty">Gráfico indisponível no modo offline. A composição permanece listada ao lado.</div>';return;}
 canvas.style.display='block';const novoGrafico=new Chart(canvas,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderColor:cssVar('--panel'),borderWidth:3,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${brl(ctx.parsed)}`}}}}});
 if(classe==='Ativo')chartPatrimonioAtivosInstance=novoGrafico;else chartPatrimonioPassivosInstance=novoGrafico;
 if(legend)legend.innerHTML=labels.map((label,i)=>`<div class="composition-legend-item"><span><i style="background:${colors[i]}"></i>${label}</span><b>${brl(data[i])}</b></div>`).join('');
}
function compararDividaAtivos(){const ativos=appData.patrimonio.filter(p=>p.classe==='Ativo'&&Number(p.valor)>0);const rent=ativos.length?ativos.reduce((s,p)=>s+Number(p.valor)*Number(p.rentabilidadeAnual||0),0)/ativos.reduce((s,p)=>s+Number(p.valor),0):0;return appData.patrimonio.filter(p=>p.classe==='Passivo'&&p.financiamento).map(p=>({p,tir:calcularTIRFinanciamento(p),rent}))}
function cardMatches(t,c){return t.formaPagto==='Cartão'&&t.tipo==='despesa'&&(String(t.cartaoId)===String(c.id)||(!t.cartaoId&&t.cartaoNome===c.nome))}
function cardInvoiceKey(t,c){if(t?.isFaturaCartao&&t.faturaMes)return t.faturaMes;const d=parseDate(t.dataCompra);if(!d)return null;let y=d.getFullYear(),m=d.getMonth()+1;if(d.getDate()>Number(c.fechamento||31)){m++;if(m===13){m=1;y++}}return monthKey(y,m)}
function invoiceId(cardId,key){return `invoice:${String(cardId)}:${key}`}
function cardInvoiceTotal(c,key){return appData.transacoes.filter(t=>cardMatches(t,c)&&cardInvoiceKey(t,c)===key&&t.status!=='Cancelada').reduce((s,t)=>s+transactionAmount(t),0)}
function cardInvoicePaid(c,key){return (appData.pagamentosFatura||[]).filter(p=>String(p.cartaoId)===String(c.id)&&p.faturaMes===key).reduce((s,p)=>s+Number(p.valor)||0,0)}
function cardOutstanding(c){return window.FinancialEngine?FinancialEngine.cardOutstanding(appData,c):0}

function faturaStatus(cartao,key){const total=cardInvoiceTotal(cartao,key),pago=cardInvoicePaid(cartao,key);if(total<=0)return 'Sem fatura';if(pago>=total-0.01)return 'Paga';if(pago>0)return 'Parcial';return 'Pendente'}
function budgetCardCategory(){return Object.keys(appData.orcamento||{}).find(c=>c.toLocaleLowerCase('pt-BR')==='cartão de crédito'.toLocaleLowerCase('pt-BR'))||'Cartão de Crédito'}
function invoicePaymentsForMonth(key){return (appData.pagamentosFatura||[]).filter(p=>p.faturaMes===key).reduce((s,p)=>s+Math.max(0,Number(p.valor)||0),0)}
function currentCardInvoiceTotals(key){return (appData.cartoes||[]).map(c=>({card:c,total:cardInvoiceTotal(c,key),paid:cardInvoicePaid(c,key)})).filter(x=>x.total>0)}
function syncBudgetFromCardPayments(y,m){const key=monthKey(y,m);reconcileBudgetCardPayments(y,m);refreshInvoiceStatusesForMonth(key);}
function refreshInvoiceStatusesForMonth(key){
  currentCardInvoiceTotals(key).forEach(inv=>{
    const paid=cardInvoicePaid(inv.card,key);
    const status=paid>=inv.total-0.01?'Paga':paid>0?'Parcial':'Pendente';
    appData.transacoes.forEach(t=>{
      if(t.tipo==='despesa'&&String(t.cartaoId)===String(inv.card.id)&&cardInvoiceKey(t,inv.card)===key)t.faturaStatus=status;
    });
  });
}
function reconcileBudgetCardPayments(y,m){
  const key=monthKey(y,m), cat=budgetCardCategory(), state=getBudgetState(y,m,cat), desired=Math.max(0,Number(state.pagoMes)||0);
  const invoices=currentCardInvoiceTotals(key);
  const totalInvoice=invoices.reduce((s,x)=>s+x.total,0);
  const manualPaid=(appData.pagamentosFatura||[]).filter(p=>p.faturaMes===key && p.origem!=='orcamento').reduce((s,p)=>s+Math.max(0,Number(p.valor)||0),0);
  const autoPaid=(appData.pagamentosFatura||[]).filter(p=>p.faturaMes===key && p.origem==='orcamento').reduce((s,p)=>s+Math.max(0,Number(p.valor)||0),0);
  const targetAuto=Math.max(0,Math.min(Math.max(0,totalInvoice-manualPaid),desired-manualPaid));
  let delta=targetAuto-autoPaid;
  if(delta>0){
    for(const inv of invoices){
      if(delta<=0) break;
      const already=cardInvoicePaid(inv.card,key);
      const available=Math.max(0,inv.total-already);
      const add=Math.min(available,delta);
      if(add<=0) continue;
      const id=Date.now()+Math.floor(Math.random()*1000000);
      const payment={id,invoiceId:invoiceId(inv.card.id,key),cartaoId:inv.card.id,faturaMes:key,valor:add,data:iso(hoje()),status:add>=Math.max(0,inv.total-cardInvoicePaid(inv.card,key))-0.01?'Paga':'Parcial',origem:'orcamento'};
      appData.pagamentosFatura.push(payment);
      appData.transacoes.push({id:id+1,descricao:`Pagamento fatura ${inv.card.nome} via orçamento`,valorTotal:add,valorParcela:add,tipo:'pagamento_cartao',categoria:cat,formaPagto:'Conta',cartaoId:inv.card.id,cartaoNome:inv.card.nome,parcelas:1,parcelaAtual:1,dataCompra:iso(hoje()),status:'Realizada',faturaMes:key,invoiceId:invoiceId(inv.card.id,key),cashImpact:-add,origem:'orcamento',pagamentoFaturaId:id});
      delta-=add;
    }
  }else if(delta<0){
    let remove=-delta;
    const autoPayments=appData.pagamentosFatura.filter(p=>p.faturaMes===key&&p.origem==='orcamento').sort((a,b)=>Number(b.id)-Number(a.id));
    for(const p of autoPayments){
      if(remove<=0) break;
      const cut=Math.min(remove,Number(p.valor)||0);
      p.valor=Math.max(0,(Number(p.valor)||0)-cut);
      remove-=cut;
      const tx=appData.transacoes.find(t=>t.pagamentoFaturaId===p.id);
      if(tx){tx.valorTotal=p.valor;tx.valorParcela=p.valor;tx.cashImpact=-p.valor;}
      if((p.valor||0)<=0){const idx=appData.pagamentosFatura.indexOf(p);if(idx>=0)appData.pagamentosFatura.splice(idx,1);const ti=appData.transacoes.findIndex(t=>t.pagamentoFaturaId===p.id);if(ti>=0)appData.transacoes.splice(ti,1);}
    }
  }
  refreshInvoiceStatusesForMonth(key);
}
function pagarFatura(cardId){const c=appData.cartoes.find(x=>String(x.id)===String(cardId));if(!c)return;const {year,month}=dashboardYM(),key=monthKey(year,month),total=cardInvoiceTotal(c,key),pago=cardInvoicePaid(c,key),rest=Math.max(0,total-pago);if(rest<=0){finToastError('A fatura selecionada já está paga.');return}confirmarAcao(`Pagar a fatura de ${c.nome} no valor de ${brl(rest)}?`,()=>{const id=Date.now();appData.pagamentosFatura.push({id,invoiceId:invoiceId(c.id,key),cartaoId:c.id,faturaMes:key,valor:rest,data:iso(hoje()),status:'Paga'});appData.transacoes.push({id:id+1,descricao:`Pagamento fatura ${c.nome}`,valorTotal:rest,valorParcela:rest,tipo:'pagamento_cartao',categoria:'Cartão de Crédito',formaPagto:'Conta',cartaoId:c.id,cartaoNome:c.nome,parcelas:1,parcelaAtual:1,dataCompra:iso(hoje()),status:'Realizada',faturaMes:key,invoiceId:invoiceId(c.id,key),cashImpact:-rest});appData.transacoes.forEach(t=>{if(t.tipo==='despesa'&&String(t.cartaoId)===String(c.id)&&cardInvoiceKey(t,c)===key)t.faturaStatus='Paga';});syncBudgetFromCardPayments(year,month);saveData({successMessage:`Fatura paga: ${brl(rest)}. Limite atualizado.`});requestRefresh('card-invoice-paid');})}

function renderizarCartoes(){
 const {year,month}=dashboardYM(),cards=appData.cartoes||[],key=monthKey(year,month);
 let limite=0,usado=0;
 cards.forEach(c=>{limite+=Number(c.limite)||0;usado+=cardOutstanding(c)});
 const elLim=$('card-limite-total'); if(elLim)elLim.textContent=brl(limite);
 const elUs=$('card-limite-usado'); if(elUs)elUs.textContent=brl(usado);
 const elDisp=$('card-limite-disp'); if(elDisp)elDisp.textContent=brl(Math.max(0,limite-usado));
 if($('card-limite-seguro'))$('card-limite-seguro').value=appData.limiteComprometimentoCartao||30;
 const byMonth={};
 cards.forEach(c=>{
   for(let i=0;i<12;i++){
     const d=addMonthsSafe(new Date(year,month-1,1),i),k=monthKey(d.getFullYear(),d.getMonth()+1);
     const compras=Math.max(0,cardInvoiceTotal(c,k)-cardInvoicePaid(c,k));
     if(compras>0)byMonth[k]=(byMonth[k]||0)+compras;
   }
   (c.compromissosFuturos||[]).forEach(f=>{
     const [fy,fm]=String(f.inicio||key).split('-').map(Number);
     if(!fy||!fm)return;
     for(let i=0;i<Number(f.meses||1);i++){
       const d=addMonthsSafe(new Date(fy,fm-1,1),i),k=monthKey(d.getFullYear(),d.getMonth()+1);
       byMonth[k]=(byMonth[k]||0)+Math.max(0,Number(f.valorMensal)||0);
     }
   });
 });
 const futureKeys=Object.keys(byMonth).filter(k=>k>=key).sort().slice(0,6);
 const futureTotal=futureKeys.reduce((sum,k)=>sum+byMonth[k],0);
 if($('card-comp-futuro'))$('card-comp-futuro').textContent=brl(futureTotal);
 let maxPct=0,maxMonth='';
 futureKeys.forEach(k=>{const [fy,fm]=k.split('-').map(Number),renda=calculateMonthlyTotals(fy,fm).receitas;if(renda>0){const pct=byMonth[k]/renda*100;if(pct>maxPct){maxPct=pct;maxMonth=k}}});
 if($('card-risco-text'))$('card-risco-text').textContent=`Comprometimento futuro: ${maxPct.toFixed(1)}% da renda`;
 const limiteSeguro=Math.max(1,Number(appData.limiteComprometimentoCartao)||30);
 if($('card-risco-progress')){const prog=Math.min(100,maxPct/limiteSeguro*100);$('card-risco-progress').style.width=prog+'%';$('card-risco-progress').className=maxPct>limiteSeguro?'risk-danger':maxPct>limiteSeguro*.8?'risk-warning':'risk-good'}
 if($('card-risco-status'))$('card-risco-status').textContent=maxPct>limiteSeguro?`🔴 Acima do limite seguro de ${limiteSeguro}%${maxMonth?' em '+monthLabel(...maxMonth.split('-').map(Number)):''}.`:maxPct>limiteSeguro*.8?`🟡 Próximo do limite seguro de ${limiteSeguro}%.`:`🟢 Dentro do limite seguro de ${limiteSeguro}%.`;
 const cardsTable=$('table-cartoes');
 if(cardsTable){cardsTable.querySelector('tbody').innerHTML=cards.map(c=>{const fatura=Math.max(0,cardInvoiceTotal(c,key)-cardInvoicePaid(c,key)),out=cardOutstanding(c),util=c.limite?out/c.limite*100:0;return `<tr><td><b>${escapeHtml(c.nome||'')}</b></td><td>${brl(c.limite)}</td><td>${brl(Math.max(0,c.limite-out))}</td><td>${util.toFixed(1)}%</td><td>${brl(fatura)}</td><td>${faturaStatus(c,key)}</td><td>${c.fechamento}/${c.vencimento}</td><td><button class="btn-sm" ${fatura<=0?'disabled':''} onclick="pagarFatura(${c.id})">${fatura<=0?'Fatura paga':'Pagar fatura'}</button> <button class="btn-sm" onclick="openCartaoModal(${c.id})">Editar</button> <button class="btn-danger" onclick="excluirCartao(${c.id})">Excluir</button></td></tr>`}).join('')||'<tr><td colspan="8">Nenhum cartão cadastrado.</td></tr>';}
 const compTable=$('table-compromissos');
 if(compTable){compTable.querySelector('tbody').innerHTML=futureKeys.map(k=>{const [fy,fm]=k.split('-').map(Number),renda=calculateMonthlyTotals(fy,fm).receitas;return `<tr><td>${monthLabel(fy,fm)}</td><td>${brl(byMonth[k])}</td><td>${renda?(byMonth[k]/renda*100).toFixed(1)+'%':'—'}</td></tr>`}).join('')||'<tr><td colspan="3">Nenhum compromisso futuro.</td></tr>';}
}

function renderizarMetas(){
 const display=$('meta-economia-display');if(display)display.textContent=appData.metaEconomia.toFixed(1)+'%';if(!$('meta-motivacao')){const c=document.querySelector('#tab-metas .card');if(c){const d=document.createElement('div');d.id='meta-motivacao';d.className='motivation-box';c.parentNode.insertBefore(d,c.nextSibling)}}renderizarMetaMotivacao();
 const hero=appData.metas.slice().sort((a,b)=>{const pa=parseDate(a.prazo),pb=parseDate(b.prazo);return pa-pb})[0];
 if(hero){const obj=Number(hero.objetivo)||0,ac=Number(hero.acumulado)||0,pct=obj?Math.min(100,ac/obj*100):0,rest=Math.max(0,obj-ac),milestone=obj*.5;const donut=$('meta-donut');if(donut){donut.style.setProperty('--progress',`${pct*3.6}deg`);donut.style.setProperty('--milestone',`${180}deg`);} $('meta-hero-percent').textContent=`${pct.toFixed(1)}%`;$('meta-hero-name').textContent=hero.nome;$('meta-hero-frase').textContent=hero.frase||'Cada aporte aproxima você do objetivo.';$('meta-hero-acumulado').textContent=brl(ac);$('meta-hero-objetivo').textContent=brl(obj);$('meta-hero-restante').textContent=brl(rest);$('meta-hero-milestone').textContent=brl(milestone);$('meta-hero-edit').dataset.id=hero.id;}
 else {$('meta-hero-percent').textContent='0%';$('meta-hero-name').textContent='Nenhuma meta cadastrada';$('meta-hero-frase').textContent='Crie uma meta para acompanhar sua evolução.';$('meta-hero-acumulado').textContent='R$ 0,00';$('meta-hero-objetivo').textContent='R$ 0,00';$('meta-hero-restante').textContent='R$ 0,00';$('meta-hero-milestone').textContent='R$ 0,00';}
 const tb=$('table-metas').querySelector('tbody');tb.innerHTML='';
 appData.metas.forEach(m=>{const obj=Number(m.objetivo),ac=Number(m.acumulado),rest=Math.max(0,obj-ac),pct=obj?Math.min(100,ac/obj*100):0,prazo=parseDate(m.prazo),meses=Math.max(1,(prazo-hoje())/(1000*60*60*24*30.44)),aporte=rest/meses,atraso=hoje()>prazo&&rest>0;tb.innerHTML+=`<tr><td><b>${escapeHtml(m.nome)}</b></td><td>${brl(ac)} / ${brl(obj)}<div class="progress"><i style="width:${pct}%"></i></div>${pct.toFixed(1)}%</td><td>${brl(rest)}</td><td>${m.prazo}</td><td>${brl(aporte)}/mês</td><td>${rest<=0?'🟢 Concluída':atraso?'🔴 Atrasada': '🟡 Em andamento'}</td><td><button class="btn-sm" onclick="openMetaModal(${m.id})">Editar</button> ${rest>0?`<button class="btn-sm" onclick="abrirNovoPrazoMeta(${m.id})">Novo prazo</button>`:''} <button class="btn-danger" onclick="excluirMeta(${m.id})">Excluir</button></td></tr>`});
}
function abrirNovoPrazoMeta(id=null){
 const target=id||Number($('meta-hero-edit')?.dataset.id);if(!target)return;const m=appData.metas.find(x=>String(x.id)===String(target));if(!m)return;metaPrazoTargetId=m.id;const rest=Math.max(0,Number(m.objetivo)-Number(m.acumulado));const prazo=parseDate(m.prazo);const baseDate=prazo&&prazo>hoje()?prazo:hoje();const cenarios=[3,6].map(extra=>{const novoPrazo=addMonthsSafe(baseDate,extra);const meses=Math.max(1,(novoPrazo-hoje())/(1000*60*60*24*30.44));return{extra,novoPrazo,aporte:rest/meses}});$('meta-prazo-contexto').textContent=`Meta: ${m.nome} · Restante: ${brl(rest)} · Prazo atual: ${m.prazo}`;$('meta-prazo-cenarios').innerHTML=cenarios.map(c=>`<div class="meta-prazo-card"><span>Novo prazo</span><b>+${c.extra} meses</b><small>${c.novoPrazo.toLocaleDateString('pt-BR')}</small><strong>${brl(c.aporte)}/mês</strong><button class="btn-sm" onclick="aplicarNovoPrazoMeta(${m.id},'${iso(c.novoPrazo)}')">Aplicar</button></div>`).join('');$('metaPrazoModal').classList.add('open')}
function fecharNovoPrazoMeta(){metaPrazoTargetId=null;$('metaPrazoModal').classList.remove('open')}
function aplicarNovoPrazoMeta(id,novaData){const m=appData.metas.find(x=>String(x.id)===String(id));if(!m)return;m.prazo=novaData;saveData();fecharNovoPrazoMeta();refreshAll()}
function editarMetaHero(){const id=Number($('meta-hero-edit')?.dataset.id);if(id)openMetaModal(id);}
function renderizarExtrato(){
 const busca=($('filtroBusca').value||'').toLowerCase(),tipo=$('filtroTipo').value,status=$('filtroStatus').value,mes=$('filtroMes').value;
 const rows=appData.transacoes.filter(t=>(!busca||`${t.descricao} ${t.categoria}`.toLowerCase().includes(busca))&&(!tipo||t.tipo===tipo)&&(!status||t.status===status)&&(!mes||t.dataCompra?.startsWith(mes))).sort((a,b)=>String(b.dataCompra).localeCompare(String(a.dataCompra)));
 const receitas=rows.filter(t=>t.tipo==='receita').reduce((s,t)=>s+transactionAmount(t),0),despesas=rows.filter(t=>t.tipo==='despesa').reduce((s,t)=>s+transactionAmount(t),0),investimentos=rows.filter(t=>t.tipo==='investimento').reduce((s,t)=>s+transactionAmount(t),0),resultado=receitas-despesas;
 if($('extrato-total-receitas'))$('extrato-total-receitas').textContent=brl(receitas);if($('extrato-total-despesas'))$('extrato-total-despesas').textContent=brl(despesas);if($('extrato-total-investimentos'))$('extrato-total-investimentos').textContent=brl(investimentos);if($('extrato-total-resultado')){$('extrato-total-resultado').textContent=brl(resultado);$('extrato-total-resultado').className=resultado<0?'expense':'income'}
 const grupos={};rows.filter(t=>t.tipo==='despesa').forEach(t=>{const c=t.categoria||'Outros';grupos[c]=(grupos[c]||0)+transactionAmount(t)});if(chartExtratoInstance)chartExtratoInstance.destroy();const canvas=$('chartExtratoCategorias');if(canvas&&typeof Chart!=='undefined'){const labels=Object.keys(grupos),data=Object.values(grupos),palette=chartPalette(labels);chartExtratoInstance=new Chart(canvas,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:palette,borderColor:cssVar('--panel'),borderWidth:3,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:cssVar('--text'),usePointStyle:true,padding:14,boxWidth:10}}}}})}
 if(canvas&&typeof Chart==='undefined'){canvas.style.display='none';let empty=canvas.parentElement.querySelector('.chart-empty');if(!empty){empty=document.createElement('div');empty.className='chart-empty';empty.textContent='Gráfico indisponível no modo offline. A tabela e os totais continuam disponíveis.';canvas.parentElement.appendChild(empty);}}
 $('table-transacoes').querySelector('tbody').innerHTML=rows.map(t=>`<tr><td>${escapeHtml(t.dataCompra||'')}</td><td>${escapeHtml(t.descricao||'')}</td><td>${escapeHtml(t.categoria||'')}</td><td class="${t.tipo==='receita'?'income':t.tipo==='despesa'?'expense':''}">${brl(transactionAmount(t))}</td><td>${t.tipo}</td><td>${t.tipo==='despesa'&&t.formaPagto==='Cartão'&&t.cartaoId?faturaStatus(appData.cartoes.find(c=>String(c.id)===String(t.cartaoId))||{},cardInvoiceKey(t,appData.cartoes.find(c=>String(c.id)===String(t.cartaoId))||{})) : t.tipo==='pagamento_cartao'?'Paga':t.status}</td><td><button class="btn-sm" onclick="openTransactionModal(${t.id})">Editar</button> <button class="btn-danger" onclick="excluirTransacao(${t.id})">Excluir</button></td></tr>`).join('')||'<tr><td colspan="7">Nenhum lançamento encontrado.</td></tr>';
}

let editingTransactionId=null, editingPatrimonioId=null, editingCartaoId=null, editingMetaId=null, editingOrcCategoria=null;
let pendingConfirmAction=null;

function confirmarAcao(texto,acao){
  pendingConfirmAction=acao;
  $('confirmModalText').textContent=texto;
  $('confirmModal').classList.add('open');
}
function closeConfirmModal(){pendingConfirmAction=null;$('confirmModal').classList.remove('open')}
function executeConfirmedAction(){
  if(pendingConfirmAction)pendingConfirmAction();
  closeConfirmModal();
}
document.addEventListener('keydown',(e)=>{
  const openModal=[...document.querySelectorAll('.modal.open')].pop();
  if(!openModal)return;
  if(e.key==='Escape'){e.preventDefault();const close=openModal.querySelector('.close');if(close)close.click();else openModal.classList.remove('open');return;}
  if(e.key==='Enter'&&openModal.id==='confirmModal'){e.preventDefault();executeConfirmedAction();}
});

function exportarDados(){
  // 4.6.2 — contrato tipado FINPRO_BACKUP quando disponível
  let payload;
  try{
    if(window.FINPRO_BACKUP?.exportJSON) payload=window.FINPRO_BACKUP.exportJSON(appData);
    else payload=JSON.stringify({format:'FinancasPRO',version:FINPRO_CORE_VERSION,exportedAt:new Date().toISOString(),appData},null,2);
  }catch(e){ payload=JSON.stringify({format:'FinancasPRO',version:FINPRO_CORE_VERSION,exportedAt:new Date().toISOString(),appData},null,2); }
  const blob=new Blob([payload],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`financaspro-backup-${iso(hoje())}.json`;
  document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(url);
}
function importarDados(event){
  const file=event.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    let data;
    try{
      const text=e.target.result;
      if(window.FINPRO_BACKUP?.importJSON){
        try{ data=window.FINPRO_BACKUP.importJSON(text); }
        catch(_envelope){
          // fallback: JSON cru de appData (backups antigos)
          const parsed=JSON.parse(text);
          if(parsed && typeof parsed==='object' && (parsed.transacoes||parsed.schemaVersion||parsed.finJourneys)) data=parsed;
          else if(parsed && parsed.appData) data=parsed.appData;
          else throw _envelope;
        }
      } else {
        const parsed=JSON.parse(text);
        data=(parsed && parsed.appData) ? parsed.appData : parsed;
      }
      if(!data||typeof data!=='object') throw new Error('formato inválido');
    }catch(err){finToastError('Não foi possível importar: arquivo inválido.');event.target.value='';return}
    confirmarAcao('Importar este arquivo vai substituir todos os dados atuais. Deseja continuar?',()=>{
      appData={transacoes:[],orcamento:{},patrimonio:[],cartoes:[],metas:[],snapshotsPatrimonio:[],finJourneys:{},finOutcomeMemory:[],finInsightsLog:[],...data};
      if(typeof finApplySchemaMigrations==='function') appData=finApplySchemaMigrations(appData);
      normalizeData();saveData();refreshAll();
      finToastSuccess('Dados importados com sucesso.');
    });
    event.target.value='';
  };
  reader.readAsText(file);
}

function applyMetaDelta(metaId, delta){ if(window.FinancialEngine) FinancialEngine.reconcileGoals(appData); }
function reverseMetaForTransaction(t){ if(window.FinancialEngine) FinancialEngine.reconcileGoals(appData); }
function applyMetaForTransaction(t){ if(window.FinancialEngine) FinancialEngine.reconcileGoals(appData); }
function processarTransacaoRealizada(t){
  if(!t || t.status!=='Realizada' || t.processadaFinanceiramente===true) return false;
  if(t.tipo==='amortizacao') aplicarAmortizacaoExtra(t);
  else if(t.tipo==='resgate' && t.patrimonioId) applyPatrimonioForTransaction(t);
  else {
    if(t.financiamentoId) applyFinanciamentoPayment(t);
    if(t.metaId) applyMetaForTransaction(t);
    if(t.patrimonioId) applyPatrimonioForTransaction(t);
  }
  t.processadaFinanceiramente=true;
  return true;
}
function reconciliarTransacoesVencidas(){
  const limite=new Date(hoje().getFullYear(),hoje().getMonth(),hoje().getDate());
  let alterado=false;
  for(const t of appData.transacoes||[]){
    if(t.status!=='Prevista'||t.status==='Cancelada') continue;
    const d=parseDate(t.dataCompra);
    if(d && d<=limite){
      t.status='Realizada';
      t.estadoOperacao='realizada';
      processarTransacaoRealizada(t);
      alterado=true;
    }
  }
  return alterado;
}
function applyPatrimonioDelta(patId,delta){
  if(!patId) return;
  const p=appData.patrimonio.find(x=>String(x.id)===String(patId));
  if(p){const novo=Math.max(0,Number(p.valorAtual ?? p.valor ?? 0)+Number(delta||0));p.valor=novo;p.valorAtual=novo;if(p.classe==='Ativo'&&p.valorAquisicao==null)p.valorAquisicao=novo;}
}
function reversePatrimonioForTransaction(t){
  if(!t||!t.patrimonioId)return;
  if(t.status==='Prevista' && t.processadaFinanceiramente!==true)return;
  const delta=t.tipo==='resgate'?Number(t.valorPatrimonioDebitado ?? t.valorParcela ?? 0):-Number(t.valorParcela||0);
  applyPatrimonioDelta(t.patrimonioId,delta);
}
function applyPatrimonioForTransaction(t){
  if(!t||!t.patrimonioId)return;
  const delta=t.tipo==='resgate'?-Number(t.valorPatrimonioDebitado ?? t.valorParcela ?? 0):Number(t.valorParcela||0);
  applyPatrimonioDelta(t.patrimonioId,delta);
  if(t.tipo==='investimento'){const p=appData.patrimonio.find(x=>String(x.id)===String(t.patrimonioId));if(p){p.valorAquisicao=Math.max(0,Number(p.valorAquisicao||0)+Number(t.valorParcela||0));}} else if(t.tipo==='resgate'){const p=appData.patrimonio.find(x=>String(x.id)===String(t.patrimonioId));if(p){const saldoAntes=Math.max(0,Number(p.valorAtual ?? p.valor ?? 0)+Number(t.valorPatrimonioDebitado||0));const custoAntes=Math.max(0,Number(p.valorAquisicao||0));const proporcao=saldoAntes>0?Math.min(1,Number(t.valorPatrimonioDebitado||0)/saldoAntes):1;p.valorAquisicao=Math.max(0,custoAntes*(1-proporcao));}}
}

const CATEGORIAS_INTELIGENTES={
  'Alimentação':['supermercado','mercado','ifood','uber eats','restaurante','lanchonete','padaria','açougue','feira','comida','lanche','delivery','pizza','café'],
  'Moradia':['aluguel','condominio','condomínio','energia','luz','água','agua','internet','telefone','gás','gas','iptu','manutenção','manutencao','móveis','moveis'],
  'Transporte':['uber','99','combustível','combustivel','gasolina','etanol','diesel','posto','estacionamento','pedágio','pedagio','metrô','metro','ônibus','onibus','passagem','oficina','mecânica','mecanica'],
  'Lazer':['cinema','netflix','spotify','disney','prime video','viagem','hotel','show','bar','jogo','games','lazer','teatro'],
  'Saúde':['farmácia','farmacia','remédio','remedio','consulta','médico','medico','dentista','exame','hospital','plano de saúde','plano de saude'],
  'Educação':['curso','faculdade','escola','livro','udemy','alura','mensalidade escolar','educação','educacao'],
  'Compras':['amazon','mercado livre','magalu','shopee','roupa','vestuário','vestuario','eletrônico','eletronico','compra'],
  'Investimentos':['aporte','tesouro','cdb','lci','lca','ações','acoes','fii','fiis','cripto','bitcoin','investimento']
};
function classificarCategoriaInteligente(descricao,tipo){
  if(!descricao)return null;
  const texto=descricao.toLocaleLowerCase('pt-BR');
  const categorias=Object.keys(appData.orcamento||{});
  const ordem=[...categorias,...Object.keys(CATEGORIAS_INTELIGENTES).filter(c=>!categorias.some(x=>x.toLowerCase()===c.toLowerCase()))];
  for(const cat of ordem){
    const palavras=CATEGORIAS_INTELIGENTES[cat]||[];
    if(palavras.some(k=>texto.includes(k.toLocaleLowerCase('pt-BR')))) return cat;
  }
  return null;
}
function sugerirCategoriaInteligente(){
  if($('txTipo')?.value!=='despesa')return;
  if(isCategoriaCartaoCredito($('txCategoriaSelect')?.value)) return;
  const sel=$('txCategoriaSelect')?.value;
  if(sel&&sel!=='__auto__'&&sel!=='__nova__')return;
  const desc=$('txDesc')?.value||''; const cat=classificarCategoriaInteligente(desc,'despesa');
  if(!cat)return;
  const exists=Object.keys(appData.orcamento).find(c=>c.toLowerCase()===cat.toLowerCase());
  if(exists){$('txCategoriaSelect').value=exists;onTxCategoriaChange();}
  else { $('txCategoriaSelect').value='__nova__'; $('txCategoriaNova').value=cat; onTxCategoriaChange(); }
}

function categoriaPadrao(tipo){return tipo==='despesa'?'Geral':tipo==='investimento'?'Investimentos':'Receita'}

function populateCategoriaSelect(selected){
  const cats=Object.keys(appData.orcamento);
  $('txCategoriaSelect').innerHTML=`<option value="__auto__">Automática (sugerida)</option>`+cats.map(c=>`<option value="${c}">${c}</option>`).join('')+`<option value="__nova__">+ Nova categoria</option>`;
  if(selected&&cats.some(c=>c.toLowerCase()===String(selected).toLowerCase())) $('txCategoriaSelect').value=cats.find(c=>c.toLowerCase()===String(selected).toLowerCase());
  else if(selected){ $('txCategoriaSelect').value='__nova__'; $('txCategoriaNova').value=selected; }
  else { $('txCategoriaSelect').value='__auto__'; }
  onTxCategoriaChange();
}
function isCategoriaCartaoCredito(nome){return String(nome||'').trim().toLocaleLowerCase('pt-BR')==='cartão de crédito'.toLocaleLowerCase('pt-BR') || String(nome||'').trim().toLocaleLowerCase('pt-BR')==='cartao de credito';}
function categoriaSelecionadaEhCartao(){
  const sel=$('txCategoriaSelect')?.value||'';
  if(sel==='__auto__'||sel==='__nova__') return false;
  return isCategoriaCartaoCredito(sel);
}
function onTxCategoriaChange(){
  $('txCategoriaNovaWrap').classList.toggle('hidden',$('txCategoriaSelect').value!=='__nova__');
  const cardOn=categoriaSelecionadaEhCartao();
  const wrap=$('txCartaoWrap');
  if(wrap) wrap.classList.toggle('hidden',!cardOn);
  if(cardOn) populateCartaoSelect($('txCartaoSelect')?.value||null);
  if($('txValorLabelText')) $('txValorLabelText').textContent=cardOn?'Valor da fatura':'Valor'; else if($('txValorLabel')) $('txValorLabel').childNodes[0].nodeValue=cardOn?'Valor da fatura':'Valor';
  if($('txDesc')) { $('txDesc').required=!cardOn; $('txDesc').placeholder=cardOn?'Observação (opcional)':'Descrição'; }
  if($('txFinanciamentoCheckWrap')) $('txFinanciamentoCheckWrap').classList.toggle('hidden',!$('txTipo')||$('txTipo').value!=='despesa'||cardOn);
  if($('txRecorrente')) $('txRecorrente').disabled=cardOn;
  if(cardOn && $('txRecorrente')?.checked){ $('txRecorrente').checked=false; onTxRecorrenciaToggle(); }
}
function populateCartaoSelect(selected){
  $('txCartaoSelect').innerHTML=appData.cartoes.length?appData.cartoes.map(c=>`<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join(''):'<option value="">Nenhum cartão cadastrado</option>';
  if(selected) $('txCartaoSelect').value=selected;
}
function onTxCartaoToggle(){
  // Compatibilidade: o antigo checkbox foi removido. O cartão agora é definido exclusivamente pela categoria.
  const on=categoriaSelecionadaEhCartao();
  $('txCartaoWrap').classList.toggle('hidden',!on);
  if(on) populateCartaoSelect($('txCartaoSelect')?.value||null);
}
function populatePatrimonioSelect(selected){
  const ativos=appData.patrimonio.filter(p=>ehAtivoInvestimento(p));
  $('txPatrimonioSelect').innerHTML=ativos.map(p=>`<option value="${p.id}">${escapeHtml(p.nome)} · Saldo ${brl(p.valorAtual??p.valor??0)}</option>`).join('')+`<option value="__novo__">+ Criar novo investimento</option>`;
  if(selected&&ativos.some(p=>String(p.id)===String(selected))) $('txPatrimonioSelect').value=selected;
  else $('txPatrimonioSelect').value='__novo__';
  onTxPatrimonioSelectChange();
}
function onTxPatrimonioSelectChange(){
  $('txPatrimonioNovoWrap').classList.toggle('hidden',$('txPatrimonioSelect').value!=='__novo__');
}
function onTxPatrimonioToggle(){
  const on=$('txTipo')?.value==='investimento';
  $('txPatrimonioFields').classList.toggle('hidden',!on);
  if(on) populatePatrimonioSelect($('txPatrimonioSelect')?.value||null);
}
function populateMetaSelect(selected){
  $('txMetaSelect').innerHTML=appData.metas.length?appData.metas.map(m=>`<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join(''):'<option value="">Nenhuma meta cadastrada</option>';
  if(selected) $('txMetaSelect').value=selected;
}
function onTxMetaToggle(){
  const on=$('txVincularMeta').checked;
  $('txMetaWrap').classList.toggle('hidden',!on);
  if(on) populateMetaSelect();
}
function setTransactionTypeOptions(types){const sel=$('txTipo');if(!sel)return;const labels={despesa:'Despesa',receita:'Receita',investimento:'Investimento / Aporte',resgate:'Resgate de investimento',amortizacao:'Amortização de financiamento'};sel.innerHTML=types.map(t=>`<option value="${t}">${labels[t]||t}</option>`).join('');if(!types.includes(sel.value))sel.value=types[0]||'despesa';}
function openAdvancedTransactionModal(tipo){openTransactionModal(null);setTransactionTypeOptions([tipo]);$('txTipo').value=tipo;onTxTipoChange();}
function openFaturaModal(){openTransactionModal(null);setTransactionTypeOptions(['despesa']);$('txTipo').value='despesa';onTxTipoChange();const cat=Object.keys(appData.orcamento||{}).find(isCategoriaCartaoCredito)||'Cartão de Crédito';if(!appData.orcamento[cat])appData.orcamento[cat]=0;if(!appData.categorias.some(isCategoriaCartaoCredito))appData.categorias.push(cat);populateCategoriaSelect(cat);$('txDesc').value='';}
function openInvestmentModal(){openAdvancedTransactionModal('investimento');}
function openResgateModal(){openAdvancedTransactionModal('resgate');}
function openAmortizacaoModal(){openAdvancedTransactionModal('amortizacao');}
function onTxInvestPurposeChange(){const p=$('txInvestPurpose')?.value||'none';$('txVincularMeta').checked=p==='meta';$('txDestinarReserva').checked=p==='reserva';onTxMetaToggle();}
function onTxTipoChange(){
  const tipo=$('txTipo').value, isDespesa=tipo==='despesa', isInvest=tipo==='investimento', isResgate=tipo==='resgate', isAmort=tipo==='amortizacao';
  const cardOn=isDespesa && categoriaSelecionadaEhCartao(); if($('txValorLabelText')) $('txValorLabelText').textContent=cardOn?'Valor da fatura':'Valor'; else if($('txValorLabel')) $('txValorLabel').childNodes[0].nodeValue=cardOn?'Valor da fatura':'Valor'; if($('txMes')) $('txMes').title=cardOn?'Mês da fatura':'Mês de referência'; if($('txDesc')){$('txDesc').required=!cardOn;$('txDesc').placeholder=cardOn?'Observação (opcional)':'Descrição';} if($('txRecorrente')){$('txRecorrente').disabled=cardOn;if(cardOn){$('txRecorrente').checked=false;onTxRecorrenciaToggle();}} if($('txFinanciamentoCheckWrap'))$('txFinanciamentoCheckWrap').classList.toggle('hidden',!isDespesa||cardOn);
  $('txCategoriaDespesaWrap').classList.toggle('hidden',!isDespesa);
  $('txCategoriaOutrosWrap').classList.toggle('hidden',isDespesa||isAmort);
  $('txFinanciamentoCheckWrap').classList.toggle('hidden',!isDespesa);
  $('txAmortizacaoWrap').classList.toggle('hidden',!isAmort);$('txResgateWrap').classList.toggle('hidden',!isResgate);
  $('txMetaCheckWrap').classList.add('hidden'); $('txReservaCheckWrap').classList.add('hidden'); $('txReservaHelp').classList.add('hidden');
  $('txInvestPurposeWrap')?.classList.toggle('hidden',!isInvest);
  if(isInvest && $('txInvestPurpose')) onTxInvestPurposeChange();
  if(isDespesa) populateCategoriaSelect();
  else if(isAmort) $('txCategoriaTexto').value='Amortização de financiamento';
  else if(isResgate) $('txCategoriaTexto').value='Resgate de investimento';
  else if(!$('txCategoriaTexto').value) $('txCategoriaTexto').value=categoriaPadrao(tipo);
  if(isResgate){populateResgatePatrimonioSelect();onTxCartaoToggle();$('txIsFinanciamento').checked=false;onTxFinanciamentoToggle();onTxPatrimonioToggle();$('txVincularMeta').checked=false;onTxMetaToggle();}else if(isAmort){
    onTxCartaoToggle();
    $('txIsFinanciamento').checked=false; onTxFinanciamentoToggle();
    onTxPatrimonioToggle();
    $('txVincularMeta').checked=false; onTxMetaToggle();
    populateAmortizacaoFinanciamentoSelect();
  }else if(!isDespesa){
    $('txIsFinanciamento').checked=false; onTxFinanciamentoToggle();
  }
  if(isInvest){
    onTxPatrimonioToggle();
  } else {
    $('txVincularMeta').checked=false; onTxMetaToggle();
    $('txDestinarReserva').checked=false;
    onTxPatrimonioToggle();
  }
}
function populateFinanciamentoSelect(selected){const sel=$('txFinanciamentoSelect');if(!sel)return;const list=appData.patrimonio.filter(p=>p.classe==='Passivo'&&p.financiamento);sel.innerHTML=list.length?list.map(p=>`<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join(''):'<option value="">Nenhum financiamento cadastrado</option>';if(selected)sel.value=selected}
function populateResgatePatrimonioSelect(selected){const sel=$('txResgatePatrimonio');if(!sel)return;const list=appData.patrimonio.filter(p=>ehAtivoInvestimento(p)&&Number(p.valorAtual??p.valor)>0);sel.innerHTML=list.length?list.map(p=>`<option value="${p.id}">${escapeHtml(p.nome)} · Saldo ${brl(p.valorAtual??p.valor)}</option>`).join(''):'<option value="">Nenhum investimento disponível</option>';if(selected)sel.value=selected;renderResgateTaxPreview()}
function rendaFixaIRAliquota(dias){if(dias<=180)return .225;if(dias<=360)return .20;if(dias<=720)return .175;return .15}
function calcularTributosResgate(p,valor,dataAplicacao,dataResgate){const saldo=Math.max(0,Number(p?.valorAtual??p?.valor)||0),bruto=Math.min(Math.max(0,Number(valor)||0),saldo),inicio=parseDate(dataAplicacao)||hoje(),fim=parseDate(dataResgate)||hoje(),dias=Math.max(0,Math.floor((fim-inicio)/86400000));const regime=String(p?.regimeTributario||'outro').toLowerCase();let rendimentoBase=Math.max(0,bruto-Math.min(bruto,Number(p?.valorAquisicao||0)));if(!(rendimentoBase>0))rendimentoBase=Math.max(0,bruto*Number(p?.rentabilidadeAnual||0)/100*(dias/365));let ir=0,iof=0;if(regime==='isento'||String(p?.categoria||'').toLowerCase().includes('lci')||String(p?.categoria||'').toLowerCase().includes('lca')){}else if(regime.includes('renda_fixa')){ir=rendimentoBase*rendaFixaIRAliquota(dias);const tabelaIOF=[.96,.93,.90,.86,.83,.80,.76,.73,.70,.66,.63,.60,.56,.53,.50,.46,.43,.40,.36,.33,.30,.26,.23,.20,.16,.13,.10,.06,.03,0];if(dias>=0&&dias<30)iof=rendimentoBase*tabelaIOF[Math.max(0,dias)];}return {bruto,dias,rendimentoBase,ir,iof,liquido:Math.max(0,bruto-ir-iof)}}
function renderResgateTaxPreview(){const p=appData.patrimonio.find(x=>String(x.id)===String($('txResgatePatrimonio')?.value));const r=calcularTributosResgate(p,$('txValor')?.value,$('txResgateDataAplicacao')?.value,$('txData')?.value);if($('txResgateIR'))$('txResgateIR').textContent=brl(r.ir);if($('txResgateIOF'))$('txResgateIOF').textContent=brl(r.iof);if($('txResgateLiquido'))$('txResgateLiquido').textContent=brl(r.liquido)}
function populateAmortizacaoFinanciamentoSelect(selected){const sel=$('txAmortizacaoFinanciamento');if(!sel)return;const list=appData.patrimonio.filter(p=>p.classe==='Passivo'&&p.financiamento&&Number(p.valor)>0);sel.innerHTML=list.length?list.map(p=>`<option value="${p.id}">${escapeHtml(p.nome)} · Saldo ${brl(p.valor)}</option>`).join(''):'<option value="">Nenhum financiamento disponível</option>';if(selected)sel.value=selected}
function onTxFinanciamentoToggle(){const on=$('txIsFinanciamento').checked;$('txFinanciamentoWrap').classList.toggle('hidden',!on);if(on)populateFinanciamentoSelect()}
function openTransactionModal(id=null){
  editingTransactionId=id;
  $('txModal').classList.add('open');
  setTransactionTypeOptions(['despesa','receita']);
  $('txMes').value=monthKey(hoje().getFullYear(),hoje().getMonth()+1); $('txData').value=monthToDate($('txMes').value);
  $('txDesc').value='';$('txValor').value='';$('txCategoriaTexto').value='';
  $('txTipo').value='despesa';$('txAmortizacaoObjetivo').value='prazo';populateAmortizacaoFinanciamentoSelect();if($('txResgateDataAplicacao'))$('txResgateDataAplicacao').value=iso(hoje());populateResgatePatrimonioSelect();
  if($('txAmortizacaoWrap')) $('txAmortizacaoWrap').classList.add('hidden');
  $('txRecorrente').checked=false;$('txRecorrenciaMeses').value=12;onTxRecorrenciaToggle();
  $('txVincularMeta').checked=false;
  $('txDestinarReserva').checked=false;$('txIsFinanciamento').checked=false;onTxFinanciamentoToggle();
  const title=$('txModal').querySelector('h3'); title.textContent=id?'Editar transação':'Nova transação';
  if(id){
    const t=appData.transacoes.find(x=>String(x.id)===String(id)); if(!t)return;
    $('txDesc').value=(t.descricao||'').replace(/\s*\(\d+\/\d+\)$/,'');
    $('txValor').value=t.valorTotal||t.valorParcela||0;
    const editTipo=['receita','despesa','investimento','resgate','amortizacao'].includes(t.tipo)?t.tipo:'despesa'; setTransactionTypeOptions(editTipo==='despesa'||editTipo==='receita'?[editTipo]:[editTipo]); $('txTipo').value=editTipo;
    $('txMes').value=dateToMonth(t.dataCompra); $('txData').value=monthToDate($('txMes').value);
    onTxTipoChange();
    if(t.tipo==='despesa'){ populateCategoriaSelect(t.categoria);$('txIsFinanciamento').checked=!!t.financiamentoId;onTxFinanciamentoToggle();if(t.financiamentoId)populateFinanciamentoSelect(t.financiamentoId);}
    else $('txCategoriaTexto').value=t.categoria||'';
    if(t.tipo==='resgate'){populateResgatePatrimonioSelect(t.patrimonioId);$('txResgateDataAplicacao').value=t.dataAplicacao||iso(hoje());renderResgateTaxPreview();}
    if(t.tipo==='amortizacao'){populateAmortizacaoFinanciamentoSelect(t.financiamentoId);$('txAmortizacaoObjetivo').value=t.amortizacaoObjetivo||'prazo';}
    // Cartões agora são definidos pela categoria. Mantemos compatibilidade com lançamentos antigos:
    // se a transação antiga era de cartão e a categoria não era Cartão de Crédito, migramos visualmente
    // para a categoria Cartão de Crédito ao editar, preservando o vínculo com o cartão.
    if(t.formaPagto==='Cartão' && t.tipo==='despesa'){
      const catCartao=Object.keys(appData.orcamento||{}).find(c=>isCategoriaCartaoCredito(c))||'Cartão de Crédito';
      if(!appData.orcamento[catCartao]) appData.orcamento[catCartao]=0;
      if(!appData.categorias.some(c=>isCategoriaCartaoCredito(c))) appData.categorias.push(catCartao);
      populateCategoriaSelect(catCartao);
      populateCartaoSelect(t.cartaoId||appData.cartoes.find(c=>c.nome===t.cartaoNome)?.id);
    } else {
      onTxCategoriaChange();
    }
    if(t.tipo==='investimento'){
      const patEdit= t.patrimonioId ? appData.patrimonio.find(p=>String(p.id)===String(t.patrimonioId)) : null;
      onTxPatrimonioToggle();
      populatePatrimonioSelect(t.patrimonioId);
      $('txVincularMeta').checked=!!t.metaId;
      $('txDestinarReserva').checked=!!(t.reservaEmergencia || patEdit?.reservaEmergencia===true);
      if($('txInvestPurpose')) $('txInvestPurpose').value=t.metaId?'meta':(t.reservaEmergencia||patEdit?.reservaEmergencia===true?'reserva':'none');
      onTxInvestPurposeChange();
      onTxMetaToggle();
      if(t.metaId) populateMetaSelect(t.metaId);
    }
  } else {
    onTxTipoChange();
  }
}
function onTxRecorrenciaToggle(){const el=$('txRecorrenciaFields');if(el)el.classList.toggle('hidden',!$('txRecorrente').checked)}
function addMonthsToDate(dateStr,offset){const d=parseDate(dateStr)||hoje();const x=new Date(d.getFullYear(),d.getMonth()+offset,d.getDate());if(x.getDate()!==d.getDate())x.setDate(0);return iso(x)}
function createRecurringTransactions(base,months){const out=[];const total=Math.max(1,Math.min(120,Number(months)||1));const recurrenceId='rec-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);for(let i=0;i<total;i++){const t={...base,id:i===0?base.id:Date.now()+i+Math.floor(Math.random()*1000),dataCompra:addMonthsToDate(base.dataCompra,i),recurrenceId,recurrenceIndex:i+1,recurrenceTotal:total};const d=parseDate(t.dataCompra);const hojeSemHora=new Date(hoje().getFullYear(),hoje().getMonth(),hoje().getDate());t.status=d&&d>hojeSemHora?'Prevista':'Realizada';t.descricao=total>1?`${base.descricao} (${i+1}/${total})`:base.descricao;out.push(t)}return out}
function closeTransactionModal(){editingTransactionId=null;$('txModal').classList.remove('open')}
function finCaptureState(){const d=finDataContext();return {at:{...d.at},nw:{...d.nw},reserva:d.reserva,cobertura:d.cobertura,cart:d.cart,pend:d.pend,anomalias:d.anomalias||[]};}
function finPostTransactionInsight(before,tx){
 try{
  const after=finDataContext(); const msgs=[];
  if(tx?.tipo==='despesa' && tx.categoria && !tx.isFaturaCartao){
    const b=Number(before.at.despesas||0),a=Number(after.at.despesas||0);
    if(a>b) msgs.push({id:'tx_spending_change',level:'info',peso:35,text:`Esse lançamento aumentou suas despesas do mês em ${brl(a-b)}.`});
    const state=getBudgetState(after.year,after.month,tx.categoria); const teto=Number(state?.planejado||appData.orcamento?.[tx.categoria]||0); const atual=Number(state?.realizado||0);
    if(teto>0 && atual/teto>=.9) msgs.push({id:'tx_budget_pressure',level:atual>teto?'warning':'info',peso:atual>teto?82:55,text:`Este lançamento levou ${tx.categoria} a ${(atual/teto*100).toFixed(0)}% do orçamento planejado.`});
  }
  if(tx?.tipo==='investimento'){
    const delta=Number(after.at.investimentos||0)-Number(before.at.investimentos||0); if(delta>0) msgs.push({id:'tx_investment',level:'success',peso:60,text:`O aporte de ${brl(delta)} foi incorporado ao patrimônio e às finalidades selecionadas.`});
  }
  if(tx?.tipo==='amortizacao'){
    const delta=Number(before.nw.dividas||0)-Number(after.nw.dividas||0); if(delta>0) msgs.push({id:'tx_amortization',level:'success',peso:62,text:`A amortização reduziu o passivo reconhecido em aproximadamente ${brl(delta)}. O efeito sobre juros e prazo depende do contrato.`});
  }
  if(tx?.tipo==='despesa' && tx.isFaturaCartao) msgs.push({id:'tx_invoice',level:'info',peso:48,text:`A fatura de ${tx.faturaMes||after.year+'-'+String(after.month).padStart(2,'0')} foi registrada como obrigação. O caixa será afetado quando ela for paga.`});

  if(!msgs.length)return;

  // Decision Assistant avalia se o evento merece fala
  const ctx=finDecisionContext();
  const decision=finDecideSpeak(msgs,ctx);
  window._finLastDecision=decision;

  if(decision.mode==='silence'){
    // registra internamente, sem interromper o usuário
    finRegisterInsight(msgs[0].id,msgs[0].level,{txId:tx.id,mes:tx.faturaMes||after.year+'-'+String(after.month).padStart(2,'0'),skipped:true},'decision_skip');
    window.finPendingEvent=null;
    return;
  }

  // Fala: grava evento pendente com profundidade decidida
  window.finPendingEvent={...msgs[0],txId:tx.id,decisionMode:decision.mode,decisionDepth:decision.depth,decisionScore:decision.score};
  finRegisterInsight(msgs[0].id,msgs[0].level,{txId:tx.id,mes:tx.faturaMes||after.year+'-'+String(after.month).padStart(2,'0'),mode:decision.mode},'transaction');
 }catch(e){console.warn('[FIN] Falha no insight pós-lançamento',e)}
}
function handleSaveTransaction(e){
  e.preventDefault();
  const finBefore=finCaptureState();
  const total=Number($('txValor').value)||0, tipo=$('txTipo').value; const dataStr=monthToDate($('txMes').value); $('txData').value=dataStr; const d=parseDate(dataStr);
  // Status é definido automaticamente: data futura = Prevista, hoje ou passado = Realizada.
  const hojeSemHora=new Date(hoje().getFullYear(),hoje().getMonth(),hoje().getDate());
  const status=(d&&d>hojeSemHora)?'Prevista':'Realizada';

  if(tipo==='resgate'){
    if($('txRecorrente').checked){finToastError('Resgate de investimento não pode ser recorrente.');return;}
    const patrimonioId=$('txResgatePatrimonio').value||null;
    const p=appData.patrimonio.find(x=>String(x.id)===String(patrimonioId));
    if(!p||!ehAtivoInvestimento(p)){finToastError('Selecione um investimento válido.');return;}
    if(!(total>0)){finToastError('Informe o valor do resgate.');return;}
    const saldoAtual=Number(p.valorAtual??p.valor)||0;
    if(total>saldoAtual+0.01){finToastError('O resgate não pode ser maior que o saldo do investimento.');return;}
    const dataAplicacao=$('txResgateDataAplicacao')?.value||p.dataAplicacao||iso(hoje());
    const trib=calcularTributosResgate(p,total,dataAplicacao,dataStr);
    if(editingTransactionId){const old=appData.transacoes.find(x=>String(x.id)===String(editingTransactionId));if(old){reverseMetaForTransaction(old);reversePatrimonioForTransaction(old);reverseFinanciamentoPayment(old);}appData.transacoes=appData.transacoes.filter(x=>String(x.id)!==String(editingTransactionId));}
    const tRes={id:editingTransactionId||novoId(),descricao:$('txDesc').value||`Resgate ${p.nome}`,valorTotal:total,valorParcela:total,tipo:'resgate',categoria:'Resgate de investimento',formaPagto:'Conta',cartaoId:null,metaId:null,patrimonioId,financiamentoId:null,parcelas:1,parcelaAtual:1,dataCompra:dataStr,dataAplicacao,status,cashImpact:trib.liquido,valorBrutoResgate:total,ir:trib.ir,iof:trib.iof,valorLiquidoResgate:trib.liquido,valorPatrimonioDebitado:total};
    appData.transacoes.push(tRes);if(status==='Realizada')processarTransacaoRealizada(tRes);saveData({successMessage:'Resgate registrado com sucesso.'});closeTransactionModal();refreshAll();return;
  }

  if(tipo==='amortizacao'){
    if($('txRecorrente').checked){finToastError('Amortização extraordinária não pode ser recorrente.');return;}
    const financiamentoId=$('txAmortizacaoFinanciamento').value||null;
    const objetivo=$('txAmortizacaoObjetivo').value||'prazo';
    const p=appData.patrimonio.find(x=>String(x.id)===String(financiamentoId));
    if(!p?.financiamento){finToastError('Selecione um financiamento válido.');return;}
    if(!(total>0)){finToastError('Informe o valor da amortização.');return;}
    if(total>Number(p.valor)+0.01){finToastError('A amortização não pode ser maior que o saldo devedor atual.');return;}
    const tAm={id:editingTransactionId||novoId(),descricao:$('txDesc').value||'Amortização extraordinária',valorTotal:total,valorParcela:total,tipo:'amortizacao',categoria:'Amortização de financiamento',formaPagto:'Conta',cartaoId:null,metaId:null,patrimonioId:null,financiamentoId,amortizacaoObjetivo:objetivo,parcelas:1,parcelaAtual:1,dataCompra:dataStr,status,cashImpact:-total};
    if(editingTransactionId){const old=appData.transacoes.find(x=>String(x.id)===String(editingTransactionId));if(old){reverseFinanciamentoPayment(old);appData.transacoes=appData.transacoes.filter(x=>String(x.id)!==String(editingTransactionId));}}
    appData.transacoes.push(tAm);
    if(status==='Realizada') processarTransacaoRealizada(tAm);
    saveData({successMessage:tipo==='receita'?'Receita salva com sucesso.':'Despesa salva com sucesso.'});closeTransactionModal();refreshAll();return;
  }

  // Categoria: para despesas, vinculada (e criada automaticamente) no Orçamento Dinâmico.
  let categoria;
  if(tipo==='despesa'){
    const inferida=classificarCategoriaInteligente($('txDesc').value,'despesa');
    const sel=$('txCategoriaSelect').value;
    if(sel==='__nova__'){
      categoria=$('txCategoriaNova').value.trim()||'Geral';
      const existe=Object.keys(appData.orcamento).some(c=>c.toLowerCase()===categoria.toLowerCase());
      if(!existe){appData.orcamento[categoria]=0;appData.categorias.push(categoria)}
    } else if(sel==='__auto__'){
      const existente=inferida&&Object.keys(appData.orcamento).find(c=>c.toLowerCase()===inferida.toLowerCase());
      categoria=existente||inferida||categoriaPadrao(tipo);
      if(!existente&&!appData.orcamento[categoria]){appData.orcamento[categoria]=0;appData.categorias.push(categoria)}
    } else categoria=sel||categoriaPadrao(tipo);
  } else {
    categoria=$('txCategoriaTexto').value.trim()||categoriaPadrao(tipo);
  }

  // Cartão: a categoria 'Cartão de Crédito' representa a FATURA DO MÊS.
  // Não registramos compras individuais. A fatura é uma obrigação, sem impacto de caixa;
  // o caixa só é afetado quando a fatura é efetivamente paga.
  const isCartao=tipo==='despesa' && isCategoriaCartaoCredito(categoria);
  const formaPagto=isCartao?'Cartão':'Conta';
  const cartaoId=isCartao?($('txCartaoSelect').value||null):null;
  const cartaoObj=isCartao?appData.cartoes.find(c=>String(c.id)===String(cartaoId)):null;
  const cartaoNome=cartaoObj?.nome||null;
  if(isCartao&&!cartaoObj){finToastError('Cadastre ou selecione um cartão antes de salvar a fatura.');return;}
  if(isCartao){ const mesFatura=$('txMes').value; const duplicada=appData.transacoes.find(x=>String(x.id)!==String(editingTransactionId||'')&&x.isFaturaCartao===true&&String(x.cartaoId)===String(cartaoId)&&x.faturaMes===mesFatura&&x.status!=='Cancelada'); if(duplicada){finToastError(`Já existe uma fatura lançada para ${cartaoNome} em ${mesFatura}. Edite a fatura existente em vez de criar outra.`);return;} }

  // Regra patrimonial: um investimento movimenta o caixa uma única vez e aumenta um único ativo patrimonial.
  // Meta e reserva são classificações/finalidades do mesmo dinheiro e NÃO geram um segundo ativo.
  let patrimonioId=null;
  const purpose=$('txInvestPurpose')?.value||'none'; const destinarReserva=tipo==='investimento' && (purpose==='reserva'||!!$('txDestinarReserva')?.checked);
  if(tipo==='investimento'){
    const sel=$('txPatrimonioSelect')?.value;
    if(!sel||sel==='__novo__'){
      const novaCat=$('txPatrimonioNovaCategoria').value.trim()||'Investimentos';
      const novo={id:Date.now()+1,nome:$('txDesc').value||'Novo investimento',classe:'Ativo',categoria:novaCat,valor:0,valorAtual:0,valorAquisicao:0,liquidez:'Alta',reservaEmergencia:destinarReserva,investivel:true,regimeTributario:novaCat.toLowerCase().includes('lci')||novaCat.toLowerCase().includes('lca')?'isento':'renda_fixa_regressiva'};
      appData.patrimonio.push(novo);
      patrimonioId=novo.id;
    } else {
      patrimonioId=sel;
    }
    const patReserva=appData.patrimonio.find(p=>String(p.id)===String(patrimonioId));
    if(patReserva && destinarReserva) patReserva.reservaEmergencia=true;
  }
  let financiamentoId=null;
  if(tipo==='despesa'&&$('txIsFinanciamento').checked) financiamentoId=$('txFinanciamentoSelect').value||null;
  let metaId=null;
  if(tipo==='investimento'&&(purpose==='meta'||$('txVincularMeta').checked)){
    metaId=$('txMetaSelect').value||null;
  }

  if(editingTransactionId){
    const old=appData.transacoes.find(t=>String(t.id)===String(editingTransactionId));
    if(old){ reverseMetaForTransaction(old); reversePatrimonioForTransaction(old); reverseFinanciamentoPayment(old); }
    appData.transacoes=appData.transacoes.filter(t=>String(t.id)!==String(editingTransactionId));
  }
  const t={id:editingTransactionId||Date.now(),
    descricao:isCartao?($('txDesc').value||`Fatura ${cartaoNome}`):$('txDesc').value,
    valorTotal:total,valorParcela:total,tipo,categoria,
    formaPagto,cartaoNome,cartaoId,metaId,patrimonioId,financiamentoId,reservaEmergencia:destinarReserva,isFaturaCartao:isCartao,faturaMes:isCartao?$('txMes').value:null,cashImpact:isCartao?0:(tipo==='receita'?total:(tipo==='despesa'||tipo==='investimento'?-total:0)),
    parcelas:1,parcelaAtual:1,dataCompra:dataStr,status};
  const recorrente=$('txRecorrente').checked && !editingTransactionId;
  const transacoesParaAdicionar=recorrente?createRecurringTransactions(t,$('txRecorrenciaMeses').value):[t];
  transacoesParaAdicionar.forEach(item=>{appData.transacoes.push(item);if(item.status==='Realizada') processarTransacaoRealizada(item);});
  saveData();
  if(t.patrimonioId) snapshotPatrimonioMensal();
  finPostTransactionInsight(finBefore,t);
  closeTransactionModal();refreshAll();
}

function excluirTransacao(id){
  confirmarAcao('Excluir esta transação?',()=>{
    const t=appData.transacoes.find(x=>String(x.id)===String(id));
    if(t){ reverseMetaForTransaction(t); reversePatrimonioForTransaction(t); reverseFinanciamentoPayment(t); }
    appData.transacoes=appData.transacoes.filter(t=>String(t.id)!==String(id));
    saveData();refreshAll();
  });
}
function onPatCategoriaChange(){
 const c=String($('patCat')?.value||'').toLocaleLowerCase('pt-BR');
 const isImovel=c.includes('imóvel')||c.includes('imovel')||c.includes('imoveis')||c.includes('imóveis');
 const box=$('patImovelFields'); if(box) box.classList.toggle('hidden',!isImovel);
 const liquidez=$('patLiquidez'); if(liquidez&&isImovel) liquidez.value='Sem liquidez';
 const rentWrap=$('patRentabilidadeWrap'); if(rentWrap) rentWrap.classList.toggle('hidden',isImovel);const invCat=['renda fixa','reserva de emergência','ações','fiis','criptoativos','investimentos','cdb','lci','lca','tesouro'].some(k=>c.includes(k));const invFields=$('patInvestimentoFields');if(invFields)invFields.classList.toggle('hidden',isImovel||!invCat);
 const reservaWrap=$('patReservaWrap'); if(reservaWrap) reservaWrap.classList.toggle('hidden',isImovel);
 const reservaHelp=$('patReservaHelp'); if(reservaHelp) reservaHelp.classList.toggle('hidden',isImovel);
 const valorWrap=$('patValorWrap'); if(valorWrap) valorWrap.classList.toggle('hidden',isImovel);
 const valor=$('patValor'); if(valor) valor.required=!isImovel;
 const atual=$('patValorAtual'); const aquis=$('patValorAquisicao');
 if(atual) atual.required=isImovel;
 if(aquis) aquis.required=isImovel;
 const renda=$('patRendaMensal'); if(renda) renda.required=isImovel && !!$('patGeraRenda')?.checked;
 if(isImovel){
   if(atual && !atual.value) atual.value=valor?.value||'';
   if(aquis && !aquis.value) aquis.value=valor?.value||'';
 }
}

function onPatImovelRendaChange(){const on=!!$('patGeraRenda')?.checked; $('patRendaMensalWrap')?.classList.toggle('hidden',!on); if($('patRendaMensal')){ $('patRendaMensal').required=on; if(!on)$('patRendaMensal').value=''; } onPatCategoriaChange();}
function onPatClasseChange(){const isPass=$('patClasse').value==='Passivo';$('patTipoPassivoWrap').classList.toggle('hidden',!isPass);if(!isPass){$('patTipoPassivo').value='outro';$('patFinanciamentoFields').classList.add('hidden');setFinanciamentoFormMode(false);onPatCategoriaChange();return}onPatTipoPassivoChange()}
function setFinanciamentoFormMode(isFin){['patCategoriaWrap','patRentabilidadeWrap','patValorWrap','patReservaWrap','patReservaHelp','patLiquidezWrap','patImovelFields','patInvestimentoFields'].forEach(id=>{const el=$(id);if(el)el.classList.toggle('hidden',isFin)});const generic=$('patGenericosFields');if(generic)generic.classList.toggle('hidden',false);const cat=$('patCat');if(cat){cat.required=!isFin;cat.value=isFin?'Financiamento Imobiliário':cat.value}const valor=$('patValor');if(valor)valor.required=!isFin;const fin=$('patFinanciamentoFields');if(fin)fin.classList.toggle('hidden',!isFin);if(isFin){$('patRentabilidade').value=0;$('patReservaEmergencia').checked=false;$('patLiquidez').value='N/A';if($('patValor'))$('patValor').required=false;if($('patValorAtual'))$('patValorAtual').required=false;if($('patValorAquisicao'))$('patValorAquisicao').required=false;if($('patRendaMensal'))$('patRendaMensal').required=false}else{onPatCategoriaChange()}}
function onPatTipoPassivoChange(){const isFin=$('patClasse').value==='Passivo'&&$('patTipoPassivo').value==='financiamento';setFinanciamentoFormMode(isFin);if(isFin&&$('patCat').value.trim()==='')$('patCat').value='Financiamento Imobiliário';sincronizarValorFinanciado()}
function sincronizarValorFinanciado(){const bem=Number($('patValorBem')?.value)||0,entrada=Math.max(0,Number($('patEntrada')?.value)||0);const financiado=Math.max(0,bem-entrada);if($('patValorFinanciado'))$('patValorFinanciado').value=financiado.toFixed(2);return financiado}
function setPatFlowMode(mode){const m=$('patFlowMode');if(m)m.value=mode;const pending=$('patFlowPending');if(pending)pending.classList.add('hidden');const classeWrap=$('patClasseWrap'),catWrap=$('patCategoriaWrap'),invCatWrap=$('patInvestCategoriaWrap'),genericos=$('patGenericosFields'),fin=$('patFinanciamentoFields'),tipoPass=$('patTipoPassivoWrap');[classeWrap,catWrap,tipoPass].forEach(el=>el?.classList.add('hidden'));invCatWrap?.classList.toggle('hidden',mode!=='investimento');if(genericos)genericos.classList.toggle('hidden',mode==='divida');if(mode==='divida'){genericos?.classList.add('hidden');$('patClasse').value='Passivo';$('patTipoPassivo').value='financiamento';$('patCat').value='Financiamento Imobiliário';onPatClasseChange();onPatTipoPassivoChange();}else{$('patClasse').value='Ativo';$('patTipoPassivo').value='outro';$('patCat').value=mode==='imovel'?'Imóvel':($('patInvestCategoria')?.value||'Investimentos');onPatClasseChange();onPatCategoriaChange();if(mode==='imovel'){invCatWrap?.classList.add('hidden');$('patNome').placeholder='Ex.: Apartamento';}else if(mode==='investimento'){$('patNome').placeholder='Ex.: CDB 100% CDI';if($('patInvestCategoria'))$('patInvestCategoria').value=$('patCat').value||'Investimentos';} }if(mode==='imovel')$('patGeraRenda').focus();else if(mode==='investimento')$('patValor').focus();else $('patValorBem').focus();}
function openPatrimonioFlow(mode){openPatrimonioModal(null);setPatFlowMode(mode);}
function openPatrimonioModal(id=null){
 editingPatrimonioId=id;$('patModal').classList.add('open');if($('patFlowMode'))$('patFlowMode').value='';$('patModalTitle').textContent=id?'Editar patrimônio':'Adicionar patrimônio';
 $('patNome').value='';$('patClasse').value='Ativo';$('patCat').value='';if($('patInvestCategoria'))$('patInvestCategoria').value='Investimentos';$('patRentabilidade').value=0;$('patIndexador').value='prefixado';$('patDataAplicacao').value=iso(hoje());$('patVencimento').value='';$('patRegimeTributario').value='renda_fixa_regressiva';$('patValor').value='';$('patValorAtual').value='';$('patValorAquisicao').value='';$('patGeraRenda').checked=false;$('patRendaMensal').value='';$('patReservaEmergencia').checked=false;$('patLiquidez').value='100%';$('patTipoPassivo').value='outro';$('patValorBem').value='';$('patEntrada').value=0;$('patValorFinanciado').value='';$('patTaxaJuros').value=0;$('patSistemaAmortizacao').value='price';$('patParcelasTotal').value=1;$('patParcelaMensal').value='';$('patParcelasPagas').value=0;$('patFinanciamentoFields').classList.add('hidden');setFinanciamentoFormMode(false);if(!id){$('patFlowPending')?.classList.remove('hidden');$('patClasseWrap')?.classList.add('hidden');$('patCategoriaWrap')?.classList.add('hidden');$('patTipoPassivoWrap')?.classList.add('hidden');$('patGenericosFields')?.classList.add('hidden');$('patFinanciamentoFields')?.classList.add('hidden');$('patInvestCategoriaWrap')?.classList.add('hidden');}
 if(id){const p=appData.patrimonio.find(x=>String(x.id)===String(id));if(!p)return;$('patNome').value=p.nome;$('patClasse').value=p.classe;$('patCat').value=p.categoria||'';if($('patInvestCategoria'))$('patInvestCategoria').value=p.categoria||'Investimentos';$('patRentabilidade').value=p.rentabilidadeAnual||0;$('patIndexador').value=p.indexador||'prefixado';$('patDataAplicacao').value=p.dataAplicacao||iso(hoje());$('patVencimento').value=p.vencimento||'';$('patRegimeTributario').value=p.regimeTributario||'renda_fixa_regressiva';$('patValor').value=p.valor??'';$('patValorAtual').value=p.valorAtual??p.valor??'';$('patValorAquisicao').value=p.valorAquisicao??p.valor??'';$('patGeraRenda').checked=!!p.geraRenda;$('patRendaMensal').value=p.rendaMensal||'';$('patReservaEmergencia').checked=!!p.reservaEmergencia;$('patLiquidez').value=p.liquidez||'100%';if(p.financiamento){$('patTipoPassivo').value='financiamento';$('patValorBem').value=p.financiamento.valorBem||'';$('patEntrada').value=p.financiamento.entrada||0;$('patValorFinanciado').value=p.financiamento.valorFinanciado||0;$('patTaxaJuros').value=p.financiamento.taxaJurosAnual||0;$('patSistemaAmortizacao').value=p.financiamento.sistemaAmortizacao||'price';$('patParcelasTotal').value=p.financiamento.parcelasTotal||1;$('patParcelaMensal').value=p.financiamento.parcelaMensal||'';$('patParcelasPagas').value=p.financiamento.parcelasPagas||0}}
 onPatClasseChange();onPatCategoriaChange();onPatImovelRendaChange();
 if(id&&appData.patrimonio.find(x=>String(x.id)===String(id))?.financiamento){setPatFlowMode('divida');sincronizarValorFinanciado();} else if(id){const ep=appData.patrimonio.find(x=>String(x.id)===String(id));setPatFlowMode((ep?.categoria||'').toLowerCase().includes('imovel')|| (ep?.categoria||'').toLowerCase().includes('imóvel')?'imovel':'investimento');}
}
function closePatrimonioModal(){editingPatrimonioId=null;$('patModal').classList.remove('open')}
function handleSavePatrimonio(e){
 e.preventDefault();const classe=$('patClasse').value;const isFin=classe==='Passivo'&&$('patTipoPassivo').value==='financiamento';let cat=$('patCat').value.trim();if(isFin)cat='Financiamento Imobiliário';if(!isFin&&!cat){finToastError('Informe a categoria.');return;}
 const isImovel=!isFin&&(cat.toLocaleLowerCase('pt-BR').includes('imóvel')||cat.toLocaleLowerCase('pt-BR').includes('imovel')||cat.toLocaleLowerCase('pt-BR').includes('imoveis')||cat.toLocaleLowerCase('pt-BR').includes('imóveis'));
 if(!isFin&&!isImovel&&(!(Number($('patValor').value)>0))){finToastError('Informe um valor/saldo inicial válido.');return;}
 let valorAtual=isImovel?Number($('patValorAtual').value)||0:Number($('patValor').value)||0;
 let valorAquisicao=isImovel?Number($('patValorAquisicao').value)||0:0;
 if(isImovel){if(!(valorAtual>0)){finToastError('Informe o valor atual do imóvel.');return}if(!(valorAquisicao>0)){finToastError('Informe quanto você pagou pelo imóvel.');return}}
 const data={nome:$('patNome').value.trim(),classe,categoria:cat,rentabilidadeAnual:isFin||isImovel?0:(Number($('patRentabilidade').value)||0),valor:isFin?0:valorAtual,valorAtual:isFin?0:valorAtual,valorAquisicao:isFin?0:valorAquisicao,geraRenda:isImovel&&$('patGeraRenda').checked,rendaMensal:isImovel?Math.max(0,Number($('patRendaMensal').value)||0):0,liquidez:isFin?'N/A':(isImovel?'Sem liquidez':$('patLiquidez').value),reservaEmergencia:classe==='Ativo'&&!isFin&&!isImovel&&$('patReservaEmergencia').checked,financiamento:null,investivel:classe==='Ativo'&&!isFin&&!isImovel&&(['renda fixa','reserva de emergência','ações','fiis','criptoativos','investimentos','investimento','cdb','lci','lca','tesouro','fundo','fundos','previdência','previdencia','cripto','bitcoin'].some(k=>cat.toLocaleLowerCase('pt-BR').includes(k))),indexador:isImovel||isFin?null:($('patIndexador')?.value||'prefixado'),dataAplicacao:isImovel||isFin?null:($('patDataAplicacao')?.value||iso(hoje())),vencimento:isImovel||isFin?null:($('patVencimento')?.value||null),regimeTributario:isImovel||isFin?'outro':($('patRegimeTributario')?.value||'renda_fixa_regressiva')};
 let financiamentoForm=null;
 if(isFin){
   const valorBem=Number($('patValorBem').value)||0,entrada=Math.max(0,Number($('patEntrada').value)||0),parcelasTotal=Math.max(1,Number($('patParcelasTotal').value)||1),parcelasPagas=Math.min(parcelasTotal,Math.max(0,Number($('patParcelasPagas').value)||0)),parcelaMensal=Number($('patParcelaMensal').value)||0;
   const valorFinanciado=Math.max(0,valorBem-entrada);
   if(!(valorBem>0)){finToastError('Informe o valor do imóvel.');return}
   if(entrada>valorBem){finToastError('A entrada não pode ser maior que o valor do imóvel.');return}
   if(!(parcelaMensal>0)){finToastError('Informe o valor da parcela mensal.');return}
   financiamentoForm={tipo:'Financiamento Imobiliário',valorBem,entrada,valorFinanciado,taxaJurosAnual:Number($('patTaxaJuros').value)||0,taxaJurosTipo:'efetiva_anual',sistemaAmortizacao:$('patSistemaAmortizacao').value||'price',parcelasTotal,parcelasPagas,parcelaMensal,saldoDevedor:valorFinanciado};
   const old=editingPatrimonioId?appData.patrimonio.find(x=>String(x.id)===String(editingPatrimonioId)):null;
   const oldF=old?.financiamento;
   const sameContract=!!oldF && Number(oldF.valorBem)===valorBem && Number(oldF.entrada)===entrada && Number(oldF.taxaJurosAnual)===Number(financiamentoForm.taxaJurosAnual) && String(oldF.sistemaAmortizacao||'price')===String(financiamentoForm.sistemaAmortizacao) && Number(oldF.parcelasTotal)===parcelasTotal && Number(oldF.parcelaMensal)===parcelaMensal;
   if(sameContract){
     financiamentoForm.saldoDevedor=Math.max(0,Number(oldF.saldoDevedor ?? old.valor ?? valorFinanciado)||0);
     financiamentoForm.parcelasPagas=Math.max(0,Number(oldF.parcelasPagas)||0);
   } else if(parcelasPagas>0 && window.FinancialEngine?.simulateFinancing){
     const simInicial=FinancialEngine.simulateFinancing(financiamentoForm,{saldoInicial:valorFinanciado,parcelasRestantes:parcelasTotal});
     const saldoPago=simInicial?.parcelas?.[parcelasPagas-1]?.saldo;
     if(Number.isFinite(saldoPago)) financiamentoForm.saldoDevedor=Math.max(0,saldoPago);
   }
   data.financiamento=financiamentoForm;
   data.valor=financiamentoForm.saldoDevedor;
   data.valorAtual=financiamentoForm.saldoDevedor;
 }
 if(editingPatrimonioId){
   const p=appData.patrimonio.find(x=>String(x.id)===String(editingPatrimonioId));
   if(p){Object.assign(p,data);if(p.financiamento){p.financiamento.taxaJurosTipo='efetiva_anual';p.financiamento.saldoDevedor=Math.max(0,Number(p.valor)||0);}
     if(isFin){const asset=appData.patrimonio.find(x=>String(x.financiamentoPassivoId)===String(p.id));if(asset){asset.nome=$('patNome').value.replace(/financiamento/i,'').trim()||asset.nome;asset.valor=Number($('patValorBem').value)||0;asset.valorAtual=asset.valor;asset.valorAquisicao=asset.valor;asset.categoria='Imóveis';asset.liquidez='Sem liquidez';}}
   }
 } else {
   const newId=novoId();appData.patrimonio.push({id:newId,...data});
   if(isFin){const assetId=novoId();appData.patrimonio.push({id:assetId,nome:$('patNome').value.replace(/financiamento/i,'').trim()||'Bem financiado',classe:'Ativo',categoria:'Imóveis',rentabilidadeAnual:0,valor:Number($('patValorBem').value)||0,valorAtual:Number($('patValorBem').value)||0,valorAquisicao:Number($('patValorBem').value)||0,geraRenda:false,rendaMensal:0,liquidez:'Sem liquidez',investivel:false,financiamento:null,financiamentoPassivoId:newId})}
 }
 saveData({successMessage:editingPatrimonioId?'Patrimônio atualizado com sucesso.':'Patrimônio adicionado com sucesso.'});closePatrimonioModal();snapshotPatrimonioMensal();refreshAll();
}
function monthlyRateFromAnnual(a){const r=Math.max(0,Number(a)||0)/100;return Math.pow(1+r,1/12)-1}
function reverseFinanciamentoPayment(t){if(!t?.financiamentoId)return;if(t.status==='Prevista' && t.processadaFinanceiramente!==true)return;const p=appData.patrimonio.find(x=>String(x.id)===String(t.financiamentoId));if(!p?.financiamento)return;if(t.tipo==='amortizacao'){const amort=Number(t.amortizacao||0);p.valor=Math.max(0,Number(p.valor)+amort);p.valorAtual=p.valor;p.financiamento.saldoDevedor=p.valor;p.financiamento.amortizacoesExtras=Math.max(0,(p.financiamento.amortizacoesExtras||0)-amort);if(t.parcelaAnterior!=null)p.financiamento.parcelaMensal=t.parcelaAnterior;return;}const amort=Number(t.amortizacao||0);p.valor=Math.max(0,Number(p.valor||0)+amort);p.valorAtual=p.valor;p.financiamento.saldoDevedor=p.valor;p.financiamento.parcelasPagas=Math.max(0,(p.financiamento.parcelasPagas||0)-1)}
function applyFinanciamentoPayment(t){
  if(!t?.financiamentoId)return;
  const p=appData.patrimonio.find(x=>String(x.id)===String(t.financiamentoId));
  if(!p?.financiamento)return;
  const calc=window.FinancialEngine?.applyFinancingPayment(p,Number(t.valorParcela||t.valorTotal||0));
  if(!calc)return;
  const f=p.financiamento;
  t.juros=calc.juros; t.amortizacao=calc.amortizacao;
  p.valor=calc.novoSaldo; p.valorAtual=calc.novoSaldo; f.saldoDevedor=calc.novoSaldo;
  f.parcelasPagas=Math.min(Number(f.parcelasTotal)||Infinity,(Number(f.parcelasPagas)||0)+1);
  f.ultimaParcelaPagaEm=t.dataCompra||iso(hoje());
  if(calc.semAmortizacao&&calc.pagamento>0)t.alertaAmortizacao='Parcela sem amortização relevante no principal.';
}
function corrigirFinanciamentosImobiliarios(){let alterado=false;for(const p of appData.patrimonio||[]){if(!p?.financiamento)continue;const f=p.financiamento;const esperado=Math.max(0,(Number(f.valorBem)||0)-(Number(f.entrada)||0));const saldoExistente=Math.max(0,Number(f.saldoDevedor ?? p.valor ?? 0)||0);const pagos=Number(f.parcelasPagas)||0;if(esperado<=0){if(Number(f.saldoDevedor||0)!==saldoExistente){f.saldoDevedor=saldoExistente;alterado=true}if(Number(p.valor||0)!==saldoExistente){p.valor=saldoExistente;p.valorAtual=saldoExistente;alterado=true}continue;}if(Number(f.valorFinanciado||0)!==esperado){f.valorFinanciado=esperado;alterado=true}if(pagos===0){if(Number(f.saldoDevedor||0)!==esperado){f.saldoDevedor=esperado;alterado=true}if(Number(p.valor||0)!==esperado){p.valor=esperado;alterado=true}if(Number(p.valorAtual||0)!==esperado){p.valorAtual=esperado;alterado=true}}else{const saldo=saldoExistente>0?saldoExistente:esperado;if(Number(f.saldoDevedor||0)!==saldo){f.saldoDevedor=saldo;alterado=true}if(Number(p.valor||0)!==saldo){p.valor=saldo;alterado=true}if(Number(p.valorAtual||0)!==saldo){p.valorAtual=saldo;alterado=true}}}return alterado}
function excluirPatrimonio(id){const linked=appData.transacoes.some(t=>String(t.patrimonioId)===String(id)||String(t.financiamentoId)===String(id));if(linked){finToastError('Este item possui lançamentos vinculados. Edite/remova os lançamentos vinculados antes de excluir o patrimônio.');return}confirmarAcao('Excluir este item patrimonial?',()=>{appData.patrimonio=appData.patrimonio.filter(p=>String(p.id)!==String(id));saveData({successMessage:'Patrimônio excluído com sucesso.'});refreshAll()})}

function futureCommitmentRows(card){return (card?.compromissosFuturos||[]).map((c,i)=>`<div class="future-row"><input placeholder="Descrição" value="${(c.descricao||'').replace(/"/g,'&quot;')}" data-future="desc"><input type="number" step="0.01" placeholder="Valor mensal" value="${c.valorMensal||0}" data-future="valor"><input type="number" min="1" value="${c.meses||1}" data-future="meses"><input type="month" value="${c.inicio||monthKey(hoje().getFullYear(),hoje().getMonth()+1)}" data-future="inicio"><button type="button" class="btn-danger" onclick="this.parentElement.remove()">×</button></div>`).join('')}
function addFutureCommitmentField(data={}){const list=$('futureCommitmentsList');const div=document.createElement('div');div.className='future-row';div.innerHTML=`<input placeholder="Descrição" value="${data.descricao||''}" data-future="desc"><input type="number" step="0.01" placeholder="Valor mensal" value="${data.valorMensal||0}" data-future="valor"><input type="number" min="1" value="${data.meses||1}" data-future="meses"><input type="month" value="${data.inicio||monthKey(hoje().getFullYear(),hoje().getMonth()+1)}" data-future="inicio"><button type="button" class="btn-danger" onclick="this.parentElement.remove()">×</button>`;list.appendChild(div)}
function readFutureCommitments(){return [...document.querySelectorAll('#futureCommitmentsList .future-row')].map(row=>{const v={};row.querySelectorAll('[data-future]').forEach(i=>v[i.dataset.future]=i.value);return {descricao:v.desc||'Compromisso',valorMensal:Number(v.valor)||0,meses:Math.max(1,Number(v.meses)||1),inicio:v.inicio||monthKey(hoje().getFullYear(),hoje().getMonth()+1)}}).filter(x=>x.valorMensal>0)}
function openCartaoModal(id=null){editingCartaoId=id;$('cartaoModal').classList.add('open');$('cartaoModalTitle').textContent=id?'Editar cartão':'Novo cartão';$('cadNome').value='';$('cadLimite').value='';$('cadFechamento').value=10;$('cadVencimento').value=17;$('futureCommitmentsList').innerHTML='';if(id){const c=appData.cartoes.find(x=>String(x.id)===String(id));if(!c)return;$('cadNome').value=c.nome;$('cadLimite').value=c.limite;$('cadFechamento').value=c.fechamento;$('cadVencimento').value=c.vencimento;(c.compromissosFuturos||[]).forEach(addFutureCommitmentField)}}
function closeCartaoModal(){editingCartaoId=null;$('cartaoModal').classList.remove('open')}
function handleSaveCartao(e){e.preventDefault();const data={nome:$('cadNome').value,limite:Number($('cadLimite').value)||0,fechamento:Number($('cadFechamento').value)||10,vencimento:Number($('cadVencimento').value)||17,compromissosFuturos:readFutureCommitments()};if(editingCartaoId){const c=appData.cartoes.find(x=>String(x.id)===String(editingCartaoId));if(c){const old=c.nome;Object.assign(c,data);appData.transacoes.forEach(t=>{if(String(t.cartaoId)===String(c.id)||t.cartaoNome===old){t.cartaoId=c.id;t.cartaoNome=data.nome}})}}else appData.cartoes.push({id:Date.now(),...data});saveData({successMessage:editingCartaoId?'Cartão atualizado com sucesso.':'Cartão cadastrado com sucesso.'});closeCartaoModal();refreshAll()}
function excluirCartao(id){
  const c=appData.cartoes.find(x=>String(x.id)===String(id));
  if(c&&appData.transacoes.some(t=>String(t.cartaoId)===String(c.id)||t.cartaoNome===c.nome)){finToastError('Este cartão possui transações vinculadas. Edite/remova essas transações antes de excluir o cartão.');return}
  confirmarAcao('Excluir este cartão?',()=>{appData.cartoes=appData.cartoes.filter(c=>String(c.id)!==String(id));saveData();refreshAll()});
}

function openMetaModal(id=null){
  editingMetaId=id;$('metaModal').classList.add('open');
  $('metaModalTitle').textContent=id?'Editar meta':'Nova meta';
  $('metaNome').value='';$('metaObjetivo').value='';$('metaAcumulado').value=0;$('metaInicio').value=iso(hoje());$('metaPrazo').value='';$('metaFrase').value='';
  if(id){const m=appData.metas.find(x=>String(x.id)===String(id));if(!m)return;$('metaNome').value=m.nome;$('metaObjetivo').value=m.objetivo;$('metaAcumulado').value=m.acumulado;$('metaInicio').value=m.inicio;$('metaPrazo').value=m.prazo;$('metaFrase').value=m.frase||''}
}
function closeMetaModal(){editingMetaId=null;$('metaModal').classList.remove('open')}
function handleSaveMeta(e){
  e.preventDefault();
  const nome=$('metaNome').value.trim();
  const objetivo=Number($('metaObjetivo').value)||0;
  const acumuladoInformado=Math.max(0,Number($('metaAcumulado').value)||0);
  const inicio=$('metaInicio').value,prazo=$('metaPrazo').value,frase=$('metaFrase').value.trim();
  const current=editingMetaId?appData.metas.find(x=>String(x.id)===String(editingMetaId)):null;
  const id=current?.id||Date.now();
  const linked=(appData.transacoes||[]).filter(t=>t.status!=='Cancelada'&&String(t.metaId)===String(id)&&['investimento','poupanca'].includes(t.tipo)).reduce((s,t)=>s+Number(t.valorParcela||t.valorTotal||0),0);
  // O valor digitado representa o total desejado para a meta naquele momento;
  // o motor guarda apenas o saldo inicial e recalcula os aportes pelas transações vinculadas.
  const saldoInicial=Math.max(0,acumuladoInformado-linked);
  const data={id,nome,objetivo,saldoInicial,inicio,prazo,frase};
  if(current)Object.assign(current,data);else appData.metas.push(data);
  if(window.FinancialEngine)FinancialEngine.reconcileGoals(appData);
  saveData();closeMetaModal();refreshAll();
}
function excluirMeta(id){confirmarAcao('Excluir esta meta? Os aportes já lançados serão preservados e deixarão de apontar para esta meta.',()=>{appData.transacoes.forEach(t=>{if(String(t.metaId)===String(id))t.metaId=null});appData.metas=appData.metas.filter(m=>String(m.id)!==String(id));saveData();refreshAll()})}
function openEconomiaMetaModal(){$('economiaMetaModal').classList.add('open');$('economiaMetaValor').value=appData.metaEconomia}
function closeEconomiaMetaModal(){$('economiaMetaModal').classList.remove('open')}
function handleSaveEconomiaMeta(e){e.preventDefault();appData.metaEconomia=Math.max(0,Math.min(100,Number($('economiaMetaValor').value)||0));saveData({successMessage:'Meta de economia atualizada com sucesso.'});closeEconomiaMetaModal();refreshAll()}
function renderizarMetaMotivacao(){const box=document.getElementById('meta-motivacao');if(!box)return;const frases=['Consistência é o segredo. Continue nesse ritmo.','Cada aporte aproxima você do que realmente importa.','Pequenos passos repetidos viram grandes conquistas.','O melhor plano é aquele que cabe na vida real.'];const metas=appData.metas;if(!metas.length){box.textContent=frases[Math.floor(Math.random()*frases.length)];return}const atrasada=metas.find(m=>parseDate(m.prazo)<hoje()&&Number(m.acumulado)<Number(m.objetivo));const ativa=atrasada||metas.find(m=>Number(m.acumulado)<Number(m.objetivo));box.textContent=ativa?.frase|| (atrasada?'O prazo passou, mas o progresso não precisa parar. Recomece com um passo possível hoje.':frases[Math.floor(Math.random()*frases.length)])}

function projectFutureCash(months=3){
  const d=dashboardYM();
  const at=calculateMonthlyTotals(d.year,d.month);
  const currentMonthResult=Number(at?.resultado||0);
  // Para o horizonte 30/60/90, o ponto de partida é explicitamente
  // a sobra (positiva ou negativa) do mês de referência.
  // Isso evita usar o fluxo histórico acumulado como se fosse saldo disponível
  // e garante que um mês negativo seja carregado para as projeções seguintes.
  const f=window.FinancialEngine?FinancialEngine.projectCash(appData,months,{baseOverride:currentMonthResult}):{base:currentMonthResult,items:[]};
  f.currentMonthResult=currentMonthResult;
  return f;
}
function renderizarForecast(){
  const box=$('assistant-forecast'); if(!box)return;
  const f=projectFutureCash(3);
  const items=Array.isArray(f.items)?f.items:[];
  const saldoAtual=Number(f.base)||0;
  const minBase=items.length?Math.min(...items.map(x=>Number(x.saldo)||0)):saldoAtual;
  const avgRec=items.length?items.reduce((s,x)=>s+(Number(x.receitas)||0),0)/items.length:0;
  const minConservador=items.length?Math.min(...items.map(x=>Number(x.saldo)||0))-avgRec*0.10:saldoAtual;
  const firstNegative=items.findIndex(x=>Number(x.saldo)<0);
  const pressure=items.length?[...items].sort((a,b)=>Number(a.saldo)-Number(b.saldo))[0]:null;
  const rows=items.map(x=>`<div class="forecast-row"><div><b>${escapeHtml(x.label||'Mês')}</b><small>${x.receitas?`+${brl(x.receitas)} receitas · `:''}${x.despesas?`-${brl(x.despesas)} despesas`:''}${x.investimentos?` · -${brl(x.investimentos)} aportes`:''}${x.pagamentos?` · -${brl(x.pagamentos)} faturas`:''}</small></div><strong class="${x.saldo<0?'danger-text':x.saldo<Math.max(0,saldoAtual*.15)?'warning-text':''}">${brl(x.saldo)}</strong></div>`).join('');
  const badge=firstNegative>=0?'⚠ Risco de caixa':(minConservador<0?'🟡 Cenário conservador pressionado':'✓ Caixa projetado positivo');
  const riskText=firstNegative>=0
    ?`<div class="forecast-risk"><b>Risco identificado:</b> o saldo projetado entra no negativo em <b>${escapeHtml(items[firstNegative].label)}</b>. Antes desse período, revise despesas discricionárias, parcelas e aportes não essenciais.</div>`
    :minConservador<0
      ?`<div class="forecast-risk"><b>Atenção:</b> no cenário conservador ilustrativo, uma redução de cerca de 10% nas receitas previstas já pressionaria o caixa. Isso é um teste de sensibilidade, não uma previsão.</div>`
      :`<div class="forecast-safe"><b>Sem déficit projetado:</b> a projeção base permanece positiva nos próximos 90 dias.</div>`;
  box.innerHTML=`<div class="forecast-head"><div><span>Saldo atual estimado</span><strong>${brl(saldoAtual)}</strong><small class="muted">baseado nos compromissos conhecidos</small></div><div class="badge ${firstNegative>=0||minConservador<0?'warn':''}">${badge}</div></div><div class="forecast-scenario"><div><span>Menor saldo · Base</span><strong class="${minBase<0?'danger-text':''}">${brl(minBase)}</strong></div><div><span>Menor saldo · Conservador</span><strong class="${minConservador<0?'warning-text':''}">${brl(minConservador)}</strong></div><div><span>Mês mais pressionado</span><strong>${pressure?escapeHtml(pressure.label):'—'}</strong></div></div><div class="forecast-list">${rows||'<div class="chart-empty">Sem compromissos futuros cadastrados para projetar.</div>'}</div>${riskText}`;
}
function detectarAnomalias(){
  const now=dashboardYM(), txNow=getMonthTransactions(now.year,now.month).filter(t=>t.tipo==='despesa');
  const out=[];
  const cats=[...new Set(txNow.map(t=>t.categoria||'Outros'))];
  const dataRef=new Date(now.year,now.month-1,1);
  const isCurrentCalendarMonth=now.year===new Date().getFullYear() && now.month===new Date().getMonth()+1;
  const dayProgress=isCurrentCalendarMonth?Math.min(1,Math.max(.01,new Date().getDate()/new Date(now.year,now.month,0).getDate())):1;
  cats.forEach(cat=>{
    const atual=txNow.filter(t=>(t.categoria||'Outros')===cat).reduce((s,t)=>s+transactionAmount(t),0);
    let soma=0,n=0;
    for(let i=1;i<=3;i++){const d=addMonthsSafe(dataRef,-i);const v=getMonthTransactions(d.getFullYear(),d.getMonth()+1).filter(t=>t.tipo==='despesa'&&(t.categoria||'Outros')===cat).reduce((s,t)=>s+transactionAmount(t),0);soma+=v;n++;}
    const media=n?soma/n:0;
    const teto=Number(appData.orcamento[cat]||0);
    const desvioPct=Math.max(5,Number(appData.finConfig?.desvioCategoriaPct??30));
    if(media>0&&atual>media*(1+desvioPct/100)){
      const diferenca=atual-media;
      const estimativaFim=isCurrentCalendarMonth?atual/dayProgress:atual;
      out.push({tipo:'historica',cat,atual,media,diferenca,pct:(atual/media-1)*100,estimativaFim});
    }
    if(teto>0&&atual/teto>=.8){
      const restante=Math.max(0,teto-atual);
      const ritmo=teto?atual/teto:0;
      out.push({tipo:'orcamento',cat,atual,media,teto,pctOrc:ritmo*100,restante,estimativaFim:isCurrentCalendarMonth?atual/dayProgress:atual});
    }
  });
  return out.sort((a,b)=>{
    const sa=a.tipo==='historica'?a.pct:(a.pctOrc||0);
    const sb=b.tipo==='historica'?b.pct:(b.pctOrc||0);
    return sb-sa;
  }).slice(0,6);
}
function renderizarAnomalias(){
  const box=$('assistant-anomalias'); if(!box)return;
  const items=detectarAnomalias();
  box.innerHTML=items.length?items.map(a=>{
    if(a.tipo==='orcamento') return `<div class="anomaly-item"><div>⚠️ <b>${escapeHtml(a.cat)}</b>: ${a.pctOrc.toFixed(0)}% do orçamento já utilizado.</div><small>${brl(a.atual)} de ${brl(a.teto)} · Restante: ${brl(a.restante)}${a.estimativaFim>a.teto?` · Mantido o ritmo, pode fechar perto de ${brl(a.estimativaFim)}.`:''}</small></div>`;
    return `<div class="anomaly-item"><div>🔎 <b>${escapeHtml(a.cat)}</b>: ${a.pct.toFixed(0)}% acima da média de 3 meses.</div><small>Atual: ${brl(a.atual)} · Média: ${brl(a.media)} · Diferença: +${brl(a.diferenca)}${a.estimativaFim>a.atual*1.05?` · Projeção simples do mês: ${brl(a.estimativaFim)}.`:''}</small></div>`;
  }).join(''):'<div class="audit-ok"><div>🟢 Nenhuma anomalia relevante identificada no período selecionado.</div><small>Continuaremos comparando o comportamento conforme novos meses forem registrados.</small></div>';
}
function popularMetaWhatIf(){
  const sel=$('wi-meta'); if(!sel)return;
  const current=sel.value;
  const metas=appData.metas||[];
  sel.innerHTML='<option value="">Nenhuma meta selecionada</option>'+metas.map(m=>`<option value="${m.id}">${escapeHtml(m.nome)} — ${brl(Number(m.acumulado||0))} / ${brl(Number(m.objetivo||0))}</option>`).join('');
  if(current)sel.value=current;
}
function finDataContext(){
  const d=dashboardYM(), at=calculateMonthlyTotals(d.year,d.month), nw=calculateNetWorth(), reserva=calculateEmergencyReserve(), media=Math.max(1,avgExpenses(6).media||0);
  const cobertura=reserva/media, f=projectFutureCash(3), risco=(f.items||[]).find(x=>Number(x.saldo)<0);
  const pend=Object.keys(appData.orcamento||{}).reduce((s,c)=>s+Math.max(0,Number(getBudgetState(d.year,d.month,c).pendenteAcumulado)||0),0);
  const cart=(appData.cartoes||[]).reduce((s,c)=>s+cardOutstanding(c),0);
  const renda=Math.max(0,Number(at.receitas)||0);
  const audit=window.FinancialEngine?.audit?FinancialEngine.audit(appData):null;
  const anomalias=detectarAnomalias();
  const config=appData.finConfig||{};
  return {year:d.year,month:d.month,at,nw,reserva,media,cobertura,f,risco,pend,cart,renda,audit,anomalias,config};
}
function finLastRuleLog(id){return (appData.finInsightsLog||[]).filter(x=>x.regra===id).sort((a,b)=>String(b.data||'').localeCompare(String(a.data||'')))[0]||null}
function finRuleWasRecent(id,hours=24){const l=finLastRuleLog(id);if(!l?.data)return false;return (Date.now()-new Date(l.data).getTime())<hours*3600000}
function finRegisterInsight(ruleId,level,context={},source='global'){
  if(!ruleId)return;
  const last=finLastRuleLog(ruleId); const fingerprint=JSON.stringify(context||{});
  if(last && last.fingerprint===fingerprint && finRuleWasRecent(ruleId,24)) return;
  appData.finInsightsLog.push({id:'fin-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),data:new Date().toISOString(),regra:ruleId,nivel:level,context,fingerprint,source,visto:false,acao:null});
  appData.finInsightsLog=appData.finInsightsLog.slice(-300); saveData({refresh:false});
}
function finMarkInsight(ruleId,action){
  const logs=appData.finInsightsLog||[];
  const l=[...logs].reverse().find(x=>x.regra===ruleId);
  if(l){l.visto=true;l.acao=action;}
  // Avança o ciclo de decisão conforme a ação do usuário
  const j=finGetJourney(ruleId)||finEnsureJourney(ruleId);
  if(j&&!j.closed){
    if(action==='ignorado' && (j.stage==='discover'||j.stage==='understand')){
      // usuário viu e dispensou cedo — fecha sem forçar
      j.closed=true; j.updatedAt=new Date().toISOString();
    } else if(action==='aprofundou'){
      if(j.stage==='discover')finAdvanceJourney(ruleId,'understand');
      else if(j.stage==='understand')finAdvanceJourney(ruleId,'compare');
      else if(j.stage==='compare'||j.stage==='decide')finAdvanceJourney(ruleId,'decide');
    }
  }
  saveData({refresh:false}); finRender();
}
function finInsightRecurrence(ruleId){const count=(appData.finInsightsLog||[]).filter(x=>x.regra===ruleId).length;return count>=3?'Este ponto já apareceu em outros momentos. Vale observar se está se tornando um padrão.':count===2?'Esse ponto já apareceu anteriormente. Vale acompanhar sua evolução.':''}
function finRuleList(){return window.FIN_MODULES.rules.createRuleList({data:()=>appData,brl,parseDate,today:hoje});}
function obterPrincipalRecomendacao(){
 const d=finDataContext();
 const aplicaveis=finRuleList().filter(r=>{try{return !!r.avalia(d)}catch(e){console.warn('[FIN rule]',r.id,e);return false;}}).map(r=>{const m=r.gerarMensagem(d);return {...m,peso:r.peso,level:r.level,tab:r.tab,id:r.id,recorrencia:finInsightRecurrence(r.id)}});
 const ordered=aplicaveis.sort((a,b)=>b.peso-a.peso);
 const r=ordered[0]||{id:'stable',peso:0,level:'success',titulo:'Seu cenário está estável neste momento',problema:'Os dados atuais não mostram um ponto que exija intervenção imediata.',motivo:'Quando não existe uma decisão relevante ou um risco significativo, o FIN prefere não criar ruído.',acao:'Continue registrando e revisando seu cenário mensalmente.',impacto:'—',tab:'dashboard'};
 if(r.id!=='stable') finRegisterInsight(r.id,r.level,{peso:r.peso,impacto:r.impacto},'global');
 return r;
}
function obterRegrasFINAplicaveis(){const d=finDataContext();return finRuleList().filter(r=>{try{return r.avalia(d)}catch(e){return false;}}).sort((a,b)=>b.peso-a.peso).map(r=>({...r,mensagem:r.gerarMensagem(d)}));}
function finDecisionForDashboard(){return finDecisionForCurrentScenario();}
function renderizarRecomendacaoFinanceira(){
  const box=$('assistant-recomendacao'); if(!box)return;
  const decision=finDecisionForDashboard();
  const r=decision.primary||obterPrincipalRecomendacao();
  $('assistant-recomendacao-prioridade').textContent=r.peso>=90?'Alta':r.peso>=70?'Média':'Baixa';
  const prioridade=r.peso>=90?'Alta':r.peso>=70?'Média':'Baixa';
  box.innerHTML=`<div class="intel-recommendation"><div class="intel-score"><span class="eyebrow">Minha melhor decisão agora</span><h4>${escapeHtml(r.titulo)}</h4><p><b>Problema:</b> ${escapeHtml(r.problema)}</p><p><b>Motivo:</b> ${escapeHtml(r.motivo)}</p><div class="intel-metrics"><div><span>Prioridade</span><strong>${prioridade}</strong></div><div><span>Impacto esperado</span><strong>${escapeHtml(r.impacto)}</strong></div><div><span>Ação</span><strong>${escapeHtml(r.acao)}</strong></div></div></div><div class="intel-actions"><h4>Plano de ação</h4><ul><li>${escapeHtml(r.acao)}</li><li>Compare o cenário no Simulador antes de executar uma mudança relevante.</li><li>O FIN não altera dados automaticamente.</li></ul></div></div>`;
}
function renderizarAssistente(){
 const {year,month}=dashboardYM(),at=calculateMonthlyTotals(year,month),nw=calculateNetWorth(),reserva=calculateEmergencyReserve(),media=avgExpenses(6).media,cob=media?reserva/media:0,prevDate=addMonthsSafe(new Date(year,month-1,1),-1),prev=calculateMonthlyTotals(prevDate.getFullYear(),prevDate.getMonth()+1);
 gerarDiagnostico(at,nw,cob,prev,prevDate.getFullYear(),prevDate.getMonth()+1,year,month);
  renderizarForecast();
  renderizarAnomalias();
  renderizarRecomendacaoFinanceira();
  popularMetaWhatIf();
}
function auditarMotorFinanceiro(){
  const engine=window.FinancialEngine;
  if(!engine?.audit){mostrarAuditoriaFinanceira({ok:false,errors:['Motor financeiro indisponível.'],warnings:[],invariants:[],ledgerEntries:0,duplicates:[]});return;}
  const r=engine.audit(appData);
  const rows=Array.isArray(r.duplicates)?r.duplicates:[];
  mostrarAuditoriaFinanceira({...r,duplicates:rows});
}

function mostrarAuditoriaFinanceira(r){
  let modal=$('auditModal');
  if(!modal){
    modal=document.createElement('div'); modal.id='auditModal'; modal.className='modal';
    modal.innerHTML=`<div class="modal-content audit-modal-content"><button class="close" type="button" onclick="closeAuditModal()">×</button><div class="audit-head"><div><span class="eyebrow">FINANCIAL ENGINE</span><h3>Auditoria Financeira</h3><p>Verificação de inconsistências, duplicidades e vínculos do motor financeiro.</p></div><div id="audit-status-badge" class="audit-status-badge"></div></div><div id="audit-summary" class="audit-summary-grid"></div><div id="audit-content" class="audit-content"></div><div class="modal-actions"><button class="btn-sm" type="button" onclick="closeAuditModal()">Fechar</button></div></div>`;
    document.body.appendChild(modal);
  }
  const critical=r.errors?.length||0, warn=r.warnings?.length||0, dups=r.duplicates?.length||0;
  const badge=$('audit-status-badge'); badge.textContent=critical?'🔴 Inconsistências encontradas':(warn||dups?'🟡 Revisar avisos':'🟢 Nenhuma inconsistência crítica'); badge.className='audit-status-badge '+(critical?'danger':(warn||dups?'warning':'success'));
  $('audit-summary').innerHTML=`<div><span>Ledger</span><strong>${Number(r.ledgerEntries||0)}</strong><small>operações auditadas</small></div><div><span>Invariantes</span><strong>${(r.invariants||[]).filter(x=>x.ok).length}/${(r.invariants||[]).length}</strong><small>regras preservadas</small></div><div><span>Duplicidades</span><strong>${dups}</strong><small>possíveis registros repetidos</small></div><div><span>Alertas</span><strong>${critical+warn}</strong><small>itens a revisar</small></div>`;
  const content=[];
  if(r.errors?.length) content.push(`<section class="audit-section"><h4>🔴 Erros críticos</h4><div class="audit-list">${r.errors.map(x=>`<div>${escapeHtml(x)}</div>`).join('')}</div></section>`);
  if(dups) content.push(`<section class="audit-section"><h4>🟡 Possíveis duplicidades</h4><div class="audit-list">${r.duplicates.map(d=>`<div><b>${escapeHtml(d.motivo)}</b><br><small>${escapeHtml(d.descricao)}</small><br><small>IDs: ${d.ids.map(escapeHtml).join(' · ')} · ${brl(d.valor)}</small></div>`).join('')}</div></section>`);
  if(r.warnings?.length) content.push(`<section class="audit-section"><h4>🟠 Avisos</h4><div class="audit-list">${r.warnings.map(x=>`<div>${escapeHtml(x)}</div>`).join('')}</div></section>`);
  if(!content.length) content.push(`<section class="audit-ok"><div>✅ O motor não encontrou inconsistências críticas, vínculos quebrados ou possíveis duplicidades nos dados atuais.</div></section>`);
  $('audit-content').innerHTML=content.join(''); modal.classList.add('open');
}
function closeAuditModal(){const m=$('auditModal');if(m)m.classList.remove('open');}

function resetarDados(){confirmarAcao('Isso apagará permanentemente todos os dados financeiros locais do FinançasPRO. Deseja continuar?',()=>{[STORAGE_KEY,'financas_pro_data','financas_pro_data_v1','financas_pro_data_v3','financaspro_data'].forEach(k=>localStorage.removeItem(k));appData={transacoes:[],orcamento:{},orcamentoControle:{},categorias:[],patrimonio:[],cartoes:[],metas:[],snapshotsPatrimonio:[],metaEconomia:30,limiteComprometimentoCartao:30,pagamentosFatura:[],finConfig:{reservaMeses:6,desvioCategoriaPct:30,comprometimentoCartaoPct:30},finInsightsLog:[],finJourneys:{},finOutcomeMemory:[],schemaVersion:22};normalizeData();localStorage.setItem(STORAGE_KEY,JSON.stringify(appData));pendingConfirmAction=null;closeConfirmModal();window.location.reload();})}

function anosAteMeta(p0,aporte,taxa,meta){if(p0>=meta)return 0;const r=Math.pow(1+taxa,1/12)-1;let p=p0;for(let n=1;n<=1200;n++){p=p*(1+r)+aporte;if(p>=meta)return n/12}return Infinity}

function toggleWhatIfAdvanced(){document.querySelectorAll('.wi-advanced-field').forEach(el=>el.classList.toggle('hidden'));const b=document.querySelector('#simPanel-whatif .btn-sm');if(b)b.textContent=b.textContent.includes('Ver')?'Ocultar diagnóstico':'Ver diagnóstico completo';}
function renderizarWhatIf(){
  const item=String($('wi-desc')?.value||'Esta compra').trim()||'Esta compra';
  const valor=Math.max(0,Number($('wi-valor')?.value)||0);
  const parcelas=Math.max(1,Number($('wi-parcelas')?.value)||1);
  const taxa=Math.max(0,Number($('wi-taxa')?.value)||0)/100;
  const horasMes=Math.max(1,Number($('wi-horas')?.value)||160);
  const d=dashboardYM(),at=calculateMonthlyTotals(d.year,d.month),renda=Math.max(0,at.receitas),margemAtual=Number(at.resultado)||0,parcela=valor/parcelas;
  const comp=renda?parcela/renda*100:0,novaMargem=margemAtual-parcela,reserva=calculateEmergencyReserve();
  const mesesSobra=margemAtual>0?valor/margemAtual:Infinity;
  const usoReserva=reserva>0?valor/reserva*100:Infinity;
  const fv5=valor*Math.pow(1+taxa,5);
  const horas=(renda>0?horasMes*valor/renda:0);
  const metaId=$('wi-meta')?.value||''; const meta=metaId?(appData.metas||[]).find(m=>String(m.id)===String(metaId)):null;
  let impactoMeta='Nenhuma meta selecionada';
  if(meta){const objetivo=Math.max(0,Number(meta.objetivo)||0),acum=Math.max(0,Number(meta.acumulado)||0),faltante=Math.max(0,objetivo-acum),aporteAtual=Math.max(0,at.investimentos); const dias=aporteAtual>0?Math.ceil(valor/Math.max(1,aporteAtual)*30):null; impactoMeta=dias?`pode atrasar aproximadamente ${dias} dias, se o valor sair do aporte mensal da meta.`:'não é possível estimar o atraso com o ritmo de aporte atual.'; if(faltante<=0)impactoMeta='a meta já está atingida; a análise deve considerar outra prioridade.';}
  const f=projectFutureCash(3), future=Array.isArray(f.items)?f.items.map(x=>Number(x.saldo)||0):[];
  const impactoParcela=Math.min(parcelas,3);
  const minAfter= future.length?Math.min(...future.map((saldo,i)=>saldo-(i<impactoParcela?parcela:0))):margemAtual-parcela;
  const baseMin=future.length?Math.min(...future):f.base;
  const futureRisk=minAfter<0;
  let status='🟢 Seguro';
  if(novaMargem<0||futureRisk||$('wi-posso')?.value==='nao'||usoReserva>50||comp>=20)status='🔴 Risco';
  else if(comp>=10||novaMargem<margemAtual*.75||$('wi-posso')?.value==='parcial'||mesesSobra>3||minAfter<Math.max(0,baseMin*.5))status='🟡 Atenção';
  $('wi-parcela').textContent=brl(parcela); $('wi-comp').textContent=comp.toFixed(1)+'%'; $('wi-margem').textContent=brl(novaMargem); $('wi-status').textContent=status;
  if($('wi-oportunidade'))$('wi-oportunidade').textContent=brl(fv5);
  if($('wi-horas-trabalho'))$('wi-horas-trabalho').textContent=horas>0?horas.toFixed(1)+' h':'—';
  if($('wi-menor-saldo-90'))$('wi-menor-saldo-90').textContent=brl(minAfter);
  if($('wi-risco-futuro'))$('wi-risco-futuro').textContent=futureRisk?'🔴 Risco':'🟢 Sem déficit';
  const quero=$('wi-quero')?.selectedOptions?.[0]?.textContent||'';const posso=$('wi-posso')?.selectedOptions?.[0]?.textContent||'';const preciso=$('wi-preciso')?.selectedOptions?.[0]?.textContent||'';
  $('wi-diagnostico').innerHTML=`<div>🧭 <b>${escapeHtml(item)}</b>: ${status}.</div><div>📊 Parcela de ${brl(parcela)} representa ${comp.toFixed(1)}% da renda mensal e deixa margem estimada de ${brl(novaMargem)}.</div><div>🔮 <b>Impacto nos próximos 90 dias:</b> o menor saldo projetado, após considerar as parcelas desta compra, seria ${brl(minAfter)}.</div><div>📈 <b>Custo de oportunidade ilustrativo:</b> se ${brl(valor)} permanecesse investido a ${($('wi-taxa')?.value||0)}% a.a., poderia chegar a ${brl(fv5)} em 5 anos. A taxa é uma hipótese de simulação.</div><div>⏱️ <b>Esforço:</b> aproximadamente ${horas>0?horas.toFixed(1):'—'} horas de trabalho, usando a renda mensal e ${horasMes} h/mês.</div><div>🎯 <b>Meta:</b> ${escapeHtml(impactoMeta)}.</div><div>❤️ <b>Quero:</b> ${escapeHtml(quero)} · <b>Posso:</b> ${escapeHtml(posso)} · <b>Preciso:</b> ${escapeHtml(preciso)}.</div>${futureRisk?'<div class="danger-text">A compra cria risco de déficit no horizonte projetado. Reavalie valor, prazo ou momento.</div>':novaMargem<0?'<div class="danger-text">A parcela torna sua margem mensal negativa. Reavalie valor, prazo ou momento.</div>':comp>=10?'<div class="warning-text">A parcela consome uma parte relevante da renda. Compare também com metas, reserva e compromissos futuros.</div>':'<div class="success-text">A compra não gera déficit nos próximos 90 dias no cenário atual, mas ainda deve ser comparada com suas metas e prioridades.</div>'}`;
  const rec=$('wi-recomendacao');
  if(rec){
    const msg=futureRisk?'Recomendação: adiar, reduzir o valor ou aumentar a entrada.':(status.startsWith('🟡')?'Recomendação: simule um valor menor ou um prazo diferente antes de confirmar.':'Recomendação: a compra parece compatível com o cenário atual, desde que não prejudique sua reserva e metas.');
    rec.innerHTML=`<div class="decision-recommendation"><span class="eyebrow">Orientação</span><strong>${msg}</strong><small>Nenhuma alteração financeira é feita automaticamente.</small></div>`;
  }
  const emo=$('wi-emocao');if(emo)emo.innerHTML=(status==='🔴 Risco'||mesesSobra>3)?`<b>Gestor de decisões:</b> considere um período de espera antes de transformar essa vontade em compromisso.`:`<b>Gestor de decisões:</b> a compra parece viável. Confirme se ela continua alinhada às suas metas.`;
}

function switchSimSubTab(tab,btn){
  simSubTabAtual=tab;
  document.querySelectorAll('.sim-subnav button').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.sim-subpanel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  $('simPanel-'+tab).classList.add('active');
  renderizarSimuladorAtivo();
}
function renderizarSimuladorAtivo(){
  if(simSubTabAtual==='imprevisto') renderizarSimuladorImprevisto(); else if(simSubTabAtual==='whatif') renderizarWhatIf(); else renderizarSimuladorGastos();
}

function renderizarSimuladorGastos(){
 const {year,month}=currentYM(), at=calculateMonthlyTotals(year,month);
 const valor=Math.max(0,Number($('gs-valor').value)||0);
 const tipo=$('gs-tipo').value;
 const duracaoSel=Number($('gs-duracao').value);
 const delta=tipo==='add'?valor:-valor;
 const novaDespesa=Math.max(0,at.despesas+delta);
 const novoResultado=at.receitas-novaDespesa;
 const novaTaxa=at.receitas?(novoResultado/at.receitas*100):0;
 $('gs-desp-atual').textContent=brl(at.despesas);
 $('gs-desp-nova').textContent=brl(novaDespesa);
 $('gs-taxa-atual').textContent=at.taxaEconomia.toFixed(1)+'%';
 $('gs-taxa-nova').textContent=novaTaxa.toFixed(1)+'%';
 const mesesAplicados=duracaoSel===0?12:Math.min(12,duracaoSel);
 const impactoAno=-delta*mesesAplicados;
 $('gs-impacto-ano').textContent=(impactoAno>=0?'+':'')+brl(impactoAno);
 $('gs-impacto-ano').style.color=impactoAno>=0?'var(--success)':'var(--danger)';
 $('gs-saldo-novo').textContent=brl(novoResultado);
 $('gs-status').textContent=novoResultado>=0?'🟢 Saldo positivo':'🔴 Saldo negativo';

 const labels=[],baseline=[],simulado=[];
 for(let n=0;n<12;n++){
   labels.push('Mês '+(n+1));
   baseline.push(at.resultado);
   const ativo=duracaoSel===0||n<duracaoSel;
   simulado.push(ativo?novoResultado:at.resultado);
 }
 if(typeof Chart==='undefined')return;
 if(chartGastosInstance)chartGastosInstance.destroy();
 const cPrimary=cssVar('--primary'),cWarn=cssVar('--warning');
 chartGastosInstance=new Chart($('chartGastos'),{type:'line',data:{labels,datasets:[
   {label:'Saldo atual (sem alteração)',data:baseline,borderColor:cPrimary,backgroundColor:cPrimary,tension:.25,pointRadius:0,borderDash:[6,4]},
   {label:'Saldo com a simulação',data:simulado,borderColor:cWarn,backgroundColor:cWarn,tension:.25,pointRadius:2}
 ]},options:chartOpts(true)});
}

function onImpOrigemChange(){
  $('imp-parcelasWrap').classList.toggle('hidden',$('imp-origem').value!=='cartao');
  renderizarSimuladorImprevisto();
}
function renderizarSimuladorImprevisto(){
 const liq=calculateLiquidAssets(), avg=avgExpenses(), media=avg.media;
 const coberturaAtual=media?liq/media:0;
 const valor=Math.max(0,Number($('imp-valor').value)||0);
 const origem=$('imp-origem').value;
 const {year,month}=currentYM(), at=calculateMonthlyTotals(year,month);
 let reservaNova=liq, parcelaMensal=0;
 const aporteMedioMensal=Math.max(0,at.investimentos);

 if(origem==='reserva') reservaNova=Math.max(0,liq-valor);
 else reservaNova=liq;

 const coberturaNova=media?reservaNova/media:0;
 $('imp-reserva-atual').textContent=brl(liq);
 $('imp-reserva-nova').textContent=brl(reservaNova);
 $('imp-cobertura-atual').textContent=coberturaAtual.toFixed(1)+' meses';
 $('imp-cobertura-nova').textContent=coberturaNova.toFixed(1)+' meses';

 if(origem==='reserva'){
   const tempo=aporteMedioMensal>0?Math.ceil(valor/aporteMedioMensal):Infinity;
   $('imp-tempo-recompor').textContent=tempo===Infinity?'Sem aporte definido este mês':tempo+' meses';
   $('imp-parcela-mensal').textContent='—';
 } else if(origem==='cartao'){
   const parcelas=Math.max(1,Number($('imp-parcelas').value)||1);
   parcelaMensal=valor/parcelas;
   $('imp-tempo-recompor').textContent=parcelas+' meses (parcelado)';
   $('imp-parcela-mensal').textContent=brl(parcelaMensal);
 } else {
   const aporteReduzido=Math.max(1,aporteMedioMensal*0.5);
   const tempo=aporteMedioMensal>0?Math.ceil(valor/aporteReduzido):Infinity;
   $('imp-tempo-recompor').textContent=tempo===Infinity?'Defina um aporte mensal':tempo+' meses reduzindo o aporte pela metade';
   $('imp-parcela-mensal').textContent='—';
 }
 $('imp-risco').textContent=coberturaNova>=6?'🟢 Reserva confortável':coberturaNova>=3?'🟡 Atenção':'🔴 Reserva crítica';
}
function capitalizarIniciais(){}

function refreshAll(reason='manual'){
  if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}
  if(isRendering) return;
  isRendering=true;
  try{
    const etapas=[['Dashboard',atualizarDashboard],['Orçamento',renderizarOrcamento],['Patrimônio',renderizarPatrimonio],['Cartões',renderizarCartoes],['Metas',renderizarMetas],['Extrato',renderizarExtrato],['Simulador',renderizarSimuladorAtivo]];
    etapas.forEach(([nome,fn])=>{
      try{fn()}
      catch(err){
        console.error(`[FinançasPRO] Falha ao atualizar ${nome}:`,err);
        const active=document.querySelector('.tab-content.active');
        if(active && active.dataset.renderError!=='1'){
          active.dataset.renderError='1';
          const panel=document.createElement('div');
          panel.className='error-panel render-error-panel';
          panel.innerHTML=`<b>Não foi possível atualizar ${nome}.</b><p>Os dados foram preservados. Tente novamente.</p><button class=\"btn-sm\" onclick=\"delete this.parentElement.dataset.renderError;refreshAll('retry')\">Tentar novamente</button>`;
          active.prepend(panel);
        }
      }
    });
  } finally {
    isRendering=false;
  }
  try{finRender()}catch(e){console.warn('[FIN] Falha ao atualizar:',e)}
}

document.addEventListener('DOMContentLoaded',()=>{
  initTheme();
  migrateData();
if(corrigirFinanciamentosImobiliarios()) saveData({refresh:false});
if(reconciliarTransacoesVencidas()) saveData({refresh:false});
  if(window.FinancialEngine){const check=FinancialEngine.validate(appData);if(!check.ok)console.warn('[FinançasPRO] Integridade inicial:',check.errors)}
  selectedDashboardMonth=localStorage.getItem('financas_pro_dashboard_month')||monthKey(hoje().getFullYear(),hoje().getMonth()+1);
  if($('dashboardMes'))$('dashboardMes').value=selectedDashboardMonth;
  if($('filtroMes'))$('filtroMes').value=monthKey(...Object.values(currentYM()));
  isInitialized=true;
  refreshAll('initial');
});
