(function(){
  const APP_VERSION='5.0.0';
  let deferredInstallPrompt=null;
  window.FinancasPROApp={version:APP_VERSION};
  function syncMobileNav(tab){
    document.querySelectorAll('.mobile-nav-btn[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  }
  window.addEventListener('financaspro:tabchange',e=>syncMobileNav(e.detail?.tab));
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault(); deferredInstallPrompt=e;
    const b=document.getElementById('installAppBtn'); if(b)b.classList.remove('hidden');
  });
  window.addEventListener('appinstalled',()=>{
    deferredInstallPrompt=null;
    const b=document.getElementById('installAppBtn'); if(b)b.classList.add('hidden');
  });
  document.addEventListener('DOMContentLoaded',()=>{
    const b=document.getElementById('installAppBtn');
    if(b)b.addEventListener('click',async()=>{
      if(!deferredInstallPrompt){ alert('A instalação fica disponível quando o FinançasPRO estiver aberto pelo navegador em um endereço seguro (HTTPS ou ambiente local de desenvolvimento).'); return; }
      deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; b.classList.add('hidden');
    });
    if('serviceWorker' in navigator && location.protocol!=='file:'){
      navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('[FinançasPRO] Service Worker:',err));
    }
  });
})();
