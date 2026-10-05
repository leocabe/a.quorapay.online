'use strict';
const AUDIO_URL = 'assets/naomi.mp3';
const messages = document.getElementById('messages');
const composer = document.getElementById('composer');
const presence = document.getElementById('presence');
// Em ecrãs estreitos, reduz o cabeçalho e a conversa na mesma proporção (calibrado com as capturas de 517 px e de telemóvel).
function fitWidth() { document.documentElement.style.setProperty('--z', Math.min(1, document.documentElement.clientWidth / 450)); }
fitWidth(); addEventListener('resize', fitWidth);
const answers = Object.create(null); // Dados em memória até à passagem do resumo para a página de pagamento.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let busy = false;
function scrollEnd() { messages.scrollTop = messages.scrollHeight; }
function bubble(text, user = false) {
  const node = document.createElement('div');
  node.className = 'bubble' + (user ? ' user' : '');
  node.textContent = text;
  messages.append(node); scrollEnd(); return node;
}
// Ritmo ao estilo WhatsApp: pausa de leitura, "a escrever…" proporcional ao tamanho do texto e
// um intervalo curto entre mensagens seguidas, com o indicador a desaparecer e a voltar.
const jitter = (min, max) => min + Math.random() * (max - min);
let lastBot = 0;
function typingTime(text) {
  return Math.min(3800, Math.max(1100, 650 + text.length * 38)) * jitter(0.9, 1.15);
}
async function say(text) {
  const sinceLast = performance.now() - lastBot;
  // Se a mensagem anterior acabou de chegar, apenas uma pequena pausa; senão, a "Katy" lê primeiro.
  await delay(sinceLast < 600 ? jitter(350, 650) : jitter(700, 1300));
  presence.textContent = 'a escrever…';
  const typing = document.createElement('div'); typing.className = 'bubble typing'; typing.setAttribute('aria-label', 'A escrever');
  typing.innerHTML = '<span></span><span></span><span></span>';
  messages.append(typing); scrollEnd();
  await delay(typingTime(text));
  typing.remove(); bubble(text); presence.textContent = 'online'; lastBot = performance.now();
}
const steps = [
 {key:'firstName',question:'Qual é o seu primeiro nome?',placeholder:'Ex: Maria',type:'text',max:60},
 {key:'surname',question:'E o apelido?',before:()=>`Prazer, ${answers.firstName}!`,placeholder:'Ex: Silva',type:'text',max:100},
 {key:'email',question:'Qual o seu email?',before:'Anotado.',placeholder:'nome@email.pt',type:'email'},
 {key:'phone',question:'E o telemóvel?',before:'Óptimo, obrigada!',placeholder:'912 345 678',type:'tel',max:11},
 {key:'birthDate',question:'Data de nascimento?',before:'Registado.',type:'date'},
 {key:'nif',question:'Qual o seu NIF (Número de Identificação Fiscal)? (opcional)',before:'Obrigada!',placeholder:'9 dígitos',type:'text',optional:true,max:9},
 {key:'fees',before:()=>answers.nif ? 'Anotado.' : 'Sem problema, seguimos em frente.',extra:'Só mais 3 perguntas rápidas antes de avançar.',question:'Sente-se limitado por taxas escondidas no seu cartão actual?',options:['Sim, muitas vezes','Às vezes','Não']},
 {key:'benefits',question:'Gostava de ter mais vantagens no dia-a-dia?',options:['Sim','Talvez','Não']},
 {key:'cashback',question:'Quer cashback em todas as compras, sem anuidades?',options:['Claro que sim','Talvez']},
 {key:'cashbackInterest',before:'É exactamente para isso que o CAPITEC PLATINUM existe.',question:'Queres receber até 5% de cashback diário (dinheiro de volta) nas tuas compras em Portugal e em lojas internacionais?',options:['Sim, quero cashback','Quero saber mais']},
 {key:'address',before:'Ótimo! Com o CAPITEC PLATINUM, podes receber parte do valor das compras de volta como cashback, conforme as condições do cartão.',question:'Qual a sua morada? (Rua, nº e código postal)',placeholder:'Rua das Flores 12, 1200-195',type:'text',max:250},
 {key:'employment',before:'Morada registada.',question:'Qual a sua situação profissional?',options:['Trabalhador por conta de outrem','Trabalhador independente','Reformado','Prefiro não indicar']},
 {key:'income',question:'Qual o seu rendimento mensal líquido aproximado?',options:['Até 1000 €','1000 € – 2000 €','2000 € – 4000 €','Mais de 4000 €']},
 {key:'goal',before:'Só mais 3 perguntas rápidas.',question:'O que farias com o dinheiro que conseguisses recuperar das tuas compras todos os meses?',options:['💰 Aumentaria as minhas poupanças','👪 Investiria na família','🏠 Ajudaria nas despesas da casa','✈️ Guardaria para viagens','🎯 Usaria para realizar um objetivo pessoal']},
 {key:'monthlyCashback',question:'Se tivesses um cartão que te devolvesse dinheiro nas compras elegíveis, quanto gostarias de recuperar por mês?',options:['10 € – 25 €','25 € – 50 €','50 € – 100 €','Mais de 100 €']},
 {key:'impact',question:'Se o teu cartão pudesse devolver até 5% do dinheiro das tuas compras por dia, sem cobrar anuidade, isso faria diferença no teu orçamento mensal?',options:['💰 Sim, bastante','👍 Sim, alguma','🤔 Talvez']},
 {key:'improvement',question:'O que gostarias de melhorar na tua vida financeira?',options:['Poupar mais','Ter mais benefícios','Ter mais liberdade','Ter mais controlo']},
 {key:'family',question:'E o que gostarias de poder proporcionar à tua família? ❤️',options:['Mais conforto','Mais segurança','Mais experiências','Um futuro melhor']},
 {key:'priority',question:'Quando escolhes um cartão, o que é mais importante para ti?',options:['Cashback','Benefícios','Liberdade','Segurança']},
 {key:'future',question:'Imagina-te daqui a 1 ano. Como gostarias de estar financeiramente?',options:['Mais tranquilo','Mais seguro','Mais livre','Mais preparado']}
];
function button(label, action) {
 const b = document.createElement('button'); b.type='button'; b.className='choice'; b.textContent=label; b.addEventListener('click',action); return b;
}
function validNif(value) {
 if (!/^[1235689]\d{8}$/.test(value)) return false;
 const sum = [...value.slice(0,8)].reduce((total,n,i)=>total+Number(n)*(9-i),0);
 const digit = 11-sum%11; return Number(value[8]) === (digit>=10 ? 0 : digit);
}
function validate(step, value) {
 if (!value) return 'Preencha este campo para continuar.';
 if (step.type==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Indique um email válido.';
 if (step.type==='tel' && !/^\d{9}$/.test(value.replace(/\D/g,''))) return 'Indique um número de telemóvel com 9 dígitos.';
 if (step.key==='nif' && !validNif(value)) return 'Indique um NIF português válido com 9 dígitos, ou ignore por agora.';
 if (step.type==='date') {
  const date=new Date(value+'T12:00:00'); const now=new Date();
  if (!Number.isFinite(date.getTime()) || date>now || date.getFullYear()<1900) return 'Escolha uma data de nascimento válida.';
 }
 return '';
}
async function ask(index) {
 composer.replaceChildren(); busy=true;
 const step=steps[index];
 if (!step) { await finish(); return; }
 if (step.before) await say(typeof step.before==='function'?step.before():step.before);
 if (step.extra) await say(step.extra);
 await say(step.question); busy=false;
 if(step.options) step.options.forEach(option=>composer.append(button(option,()=>submit(index,option,option))));
 else inputControl(index,step);
 scrollEnd();
}
function inputControl(index,step) {
 const form=document.createElement('form'); form.className='input-form';
 const wrap=document.createElement('div');wrap.className='input-wrap';
 let prefix;
 if(step.type==='tel') {
  prefix=document.createElement('select');prefix.setAttribute('aria-label','Indicativo do país');
  [['+351','Portugal'],['+244','Angola'],['+55','Brasil'],['+258','Moçambique'],['+34','Espanha'],['+33','França'],['+44','Reino Unido']].forEach(([code,country])=>{const o=document.createElement('option');o.value=code;o.textContent=code;o.title=country;prefix.append(o);}); wrap.append(prefix);
 }
 const input=document.createElement('input');input.type=step.type;input.placeholder=step.placeholder||'';input.setAttribute('aria-label',step.question);input.required=true;
 if(step.max)input.maxLength=step.max;
 if(step.key==='nif')input.inputMode='numeric';
 // Telemóvel: só algarismos, no máximo 9 depois do indicativo, agrupados como 912 345 678.
 if(step.type==='tel'){input.inputMode='numeric';input.addEventListener('input',()=>{let digits=input.value.replace(/\D/g,'');const code=prefix.value.slice(1);if(digits.length>9){digits=digits.replace(/^00/,'');if(digits.startsWith(code))digits=digits.slice(code.length);}input.value=digits.slice(0,9).replace(/(\d{3})(?=\d)/g,'$1 ');});}
 const autocomplete={firstName:'given-name',surname:'family-name',email:'email',phone:'tel-national',birthDate:'bday',address:'street-address'};input.autocomplete=autocomplete[step.key]||'off';
 if(step.type==='date'){input.min='1900-01-01';const now=new Date();input.max=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');}
 wrap.append(input);form.append(wrap);
 const send=document.createElement('button');send.type='submit';send.className='send'+(step.type==='date'?' date-send':'');send.innerHTML=(step.type==='date'?'<span>Confirmar data</span>':'')+'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V4m-7 7 7-7 7 7"/></svg>';send.setAttribute('aria-label','Enviar resposta');send.disabled=true;form.append(send);
 const error=document.createElement('p');error.className='error';error.setAttribute('role','alert');error.id='answer-error';input.setAttribute('aria-describedby',error.id);form.append(error);
 input.addEventListener('input',()=>{send.disabled=!input.value.trim();error.textContent='';input.removeAttribute('aria-invalid');});
 form.noValidate=true;
 form.addEventListener('submit',event=>{
  event.preventDefault();if(busy)return;const value=input.value.trim();const problem=validate(step,value);
  if(problem){error.textContent=problem;input.setAttribute('aria-invalid','true');return;}
  let display=value;let stored=value;
  if(step.type==='tel'){stored=prefix.value+' '+value;display=stored;}
  if(step.type==='date') display=value.split('-').reverse().join('/');
  submit(index,stored,display);
 });
 composer.append(form);
 if(step.type==='date') installCalendar(input,wrap);
 if(step.optional){const skip=button('Ignorar por agora',()=>submit(index,'','— não indicado'));skip.className='skip';composer.append(skip);}
 // Evita abrir o teclado automaticamente antes de o visitante tocar no campo.
}
function installCalendar(input, wrap) {
 const trigger=document.createElement('button');trigger.type='button';trigger.className='date-trigger';trigger.innerHTML='<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg><span>Toque para escolher a data</span>';
 input.hidden=true;wrap.append(trigger);
 const calendar=document.createElement('div');calendar.className='calendar';calendar.hidden=true;calendar.setAttribute('aria-label','Escolher data de nascimento');wrap.append(calendar);
 let month=0,year=1990;
 const months=['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
 function render(){
  calendar.replaceChildren();const top=document.createElement('div');top.className='calendar-top';
  const previous=button('‹',()=>{if(month===0){month=11;year--;}else month--;render();});previous.setAttribute('aria-label','Mês anterior');
  const next=button('›',()=>{if(month===11){month=0;year++;}else month++;render();});next.setAttribute('aria-label','Mês seguinte');
  const monthSelect=document.createElement('select');monthSelect.setAttribute('aria-label','Mês');months.forEach((name,i)=>{const option=new Option(name,String(i));option.selected=i===month;monthSelect.add(option);});monthSelect.onchange=()=>{month=Number(monthSelect.value);render();};
  const yearSelect=document.createElement('select');yearSelect.setAttribute('aria-label','Ano');for(let y=new Date().getFullYear();y>=1900;y--){const option=new Option(String(y),String(y));option.selected=y===year;yearSelect.add(option);}yearSelect.onchange=()=>{year=Number(yearSelect.value);render();};
  top.append(previous,monthSelect,yearSelect,next);calendar.append(top);
  const grid=document.createElement('div');grid.className='calendar-grid';['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(day=>{const label=document.createElement('span');label.textContent=day;grid.append(label);});
  const offset=new Date(year,month,1).getDay();const length=new Date(year,month+1,0).getDate();
  for(let i=0;i<Math.ceil((offset+length)/7)*7;i++){
   const day=i-offset+1;const actual=new Date(year,month,day);const value=[actual.getFullYear(),String(actual.getMonth()+1).padStart(2,'0'),String(actual.getDate()).padStart(2,'0')].join('-');
   const b=document.createElement('button');b.type='button';b.textContent=actual.getDate();b.className=(day<1||day>length?'outside ':'')+(input.value===value?'selected':'');b.disabled=value>input.max||value<input.min;
   b.onclick=()=>{input.value=value;trigger.querySelector('span').textContent=value.split('-').reverse().join('/');input.dispatchEvent(new Event('input'));calendar.hidden=true;trigger.setAttribute('aria-expanded','false');};grid.append(b);
  }calendar.append(grid);
 }
 trigger.setAttribute('aria-expanded','false');trigger.onclick=()=>{calendar.hidden=!calendar.hidden;trigger.setAttribute('aria-expanded',String(!calendar.hidden));if(!calendar.hidden)render();};
 document.addEventListener('pointerdown',event=>{if(!wrap.contains(event.target)){calendar.hidden=true;trigger.setAttribute('aria-expanded','false');}});
 trigger.addEventListener('keydown',event=>{if(event.key==='Escape'){calendar.hidden=true;trigger.setAttribute('aria-expanded','false');}});
}
async function submit(index,value,display) {
 if(busy)return;busy=true;answers[steps[index].key]=value;composer.replaceChildren();bubble(display,true);await ask(index+1);
}
async function validationMessage(text) {
 const row=document.createElement('div');row.className='bubble validation';
 const status=document.createElement('span');status.className='status';status.setAttribute('aria-label','Em curso');
 const label=document.createElement('span');label.textContent=text;row.append(status,label);messages.append(row);scrollEnd();
 await delay(1500);row.classList.add('done');status.textContent='✓';status.setAttribute('aria-label','Concluído');scrollEnd();
}
function personalisedCard() {
 const card=document.createElement('div');card.className='card-result';
 const image=document.createElement('img');image.src='assets/nova-card.png';image.alt='Pré-visualização do cartão personalizado';
 const name=document.createElement('span');name.className='card-name';name.textContent=answers.firstName+' '+answers.surname;card.append(image,name);messages.append(card);
 const note=document.createElement('p');note.className='card-note';note.textContent='Dados sensíveis ocultos por segurança. O cartão físico será enviado para a morada indicada.';messages.append(note);scrollEnd();
}
function shippingPreview() {
 const box=document.createElement('section');box.className='shipping';
 const title=document.createElement('h2');title.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12M7.5 4.3l9 5.1"/></svg><span>ENVIO DO SEU CARTÃO</span>';box.append(title);
 const body=document.createElement('div');body.className='shipping-body';
 const intro=document.createElement('strong');intro.textContent='O seu cartão físico será enviado em 5 a 7 dias úteis para a morada indicada, juntamente com todas as informações de activação.';body.append(intro);
 const dl=document.createElement('dl');
 const rowIcons={user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',card:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',pin:'<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>',mail:'<rect x="2" y="4" width="20" height="16" rx="2.5"/><path d="m22 7-10 6L2 7"/>'};
 [['user',`Titular: ${answers.firstName} ${answers.surname}`],['card','Limite: 5100 €'],['pin',`Morada: ${answers.address}`],['mail',`Confirmação por email: ${answers.email}`]].forEach(([icon,text])=>{const dd=document.createElement('dd');dd.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${rowIcons[icon]}</svg><span></span>`;dd.lastChild.textContent=text;dl.append(dd);});body.append(dl);
 const note=document.createElement('small');note.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/></svg><span>Inclui código PIN, manual e activação segura.</span>';body.append(note);box.append(body);messages.append(box);scrollEnd();
}
async function finish() {
 await say('Perfeito. Vou analisar os seus dados agora. Um momento…');
 for(const text of ['A validar os seus dados pessoais','A consultar elegibilidade','A emitir o seu cartão MASTERCARD PLATINUM','A finalizar a proposta']) await validationMessage(text);
 await say(`Parabéns, ${answers.firstName}! O seu pedido foi aprovado.`);
 await say('Foi-lhe atribuído um limite de 5100 €. Não representa uma oferta de crédito.');
 await say('A gerar o seu cartão MASTERCARD PLATINUM personalizado…');
 await delay(1100);personalisedCard();await delay(1400);shippingPreview();
 for(const text of ['Enquanto isso, veja as vantagens que já estão incluídas:','Até 5% de cashback diário nas suas compras.','Sem anuidade.','Sem taxas em pagamentos internacionais.','Gestão completa pela app, a qualquer momento.','Antes de finalizar, tem a possibilidade de escolher um crédito inicial pré-carregado no seu cartão.','O carregamento é feito em euros. Pode usá-lo desde o primeiro dia — escolha o valor que preferir:','Qual valor gostaria de ter disponível no seu cartão?']) await say(text);
 const options=['450 € — liquidar em 1 mês','950 € — liquidar em 3 semanas','7.700 € — liquidar em 6 meses','10.700 € — liquidar em 9 meses','17.000 € — liquidar em 12 meses'];
 busy=false;
 composer.classList.add('credit-options');
 options.forEach(option=>composer.append(button(option,async()=>{
  if(busy)return;busy=true;answers.initialCredit=option;composer.replaceChildren();composer.classList.remove('credit-options');bubble(option,true);
  await say('Escolha registada.');
  await chooseShipping();
 })));scrollEnd();
}
// Última etapa: escolha do envio em cartões, como na captura (Expresso recomendado).
const shippingOptions=[
 {name:'Envio Económico',price:'14,99 €',days:'7 a 10 dias úteis',minDays:7,text:'Entrega padrão com seguimento básico.',icon:'<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'},
 {name:'Envio Expresso',price:'17,99 €',days:'3 a 4 dias úteis',minDays:3,text:'Envio prioritário com seguimento em tempo real.',icon:'<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',recommended:true},
 {name:'Envio Premium',price:'22,99 €',days:'1 a 2 dias úteis',minDays:1,text:'Entrega ultra-rápida com prioridade máxima.',icon:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>'}
];
async function chooseShipping() {
 for(const text of ['Falta apenas escolher o envio do seu CAPITEC PLATINUM.','Escolha a opção que preferir — pode ver o prazo e o valor de cada uma a seguir.','Qual opção de envio prefere?']) await say(text);
 const list=document.createElement('div');list.className='ship-options';
 shippingOptions.forEach(option=>{
  const card=document.createElement('button');card.type='button';card.className='ship-option'+(option.recommended?' recommended':'');
  card.innerHTML=(option.recommended?'<span class="ship-badge">RECOMENDADO</span>':'')+`<span class="ship-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${option.icon}</svg></span><span class="ship-body"><span class="ship-top"><strong></strong><b></b></span><span class="ship-days"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg><span></span></span><span class="ship-text"></span></span>`;
  card.querySelector('strong').textContent=option.name;card.querySelector('b').textContent=option.price;card.querySelector('.ship-days>span').textContent=option.days;card.querySelector('.ship-text').textContent=option.text;
  card.addEventListener('click',async()=>{
   if(busy)return;busy=true;answers.shipping=option.name;composer.replaceChildren();composer.classList.remove('ship-mode');bubble(`${option.name} — ${option.price} (${option.days})`,true);
   await say(`Óptimo! ${option.name} confirmado — entrega em ${option.days}.`);
   await chooseDeliveryDate(option);
  });
  list.append(card);
 });
 composer.classList.add('ship-mode');composer.append(list);busy=false;scrollEnd();
}
const display=date=>[String(date.getDate()).padStart(2,'0'),String(date.getMonth()+1).padStart(2,'0'),date.getFullYear()].join('/');
const isoDate=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const svgIcon=(paths,cls='')=>`<svg${cls?` class="${cls}"`:''} viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const icons={
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
 pencil:'<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
 shield:'<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/>',
 badge:'<path d="M12 2.5l2.4 1.7 2.9-.1.9 2.8 2.3 1.8-.9 2.8.9 2.8-2.3 1.8-.9 2.8-2.9-.1L12 21.5l-2.4-1.7-2.9.1-.9-2.8-2.3-1.8.9-2.8-.9-2.8 2.3-1.8.9-2.8 2.9.1Z"/><path d="m9 12 2 2 4-4"/>',
 box:'<path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12M7.5 4.3l9 5.1"/>',
 pin:'<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>'
};
// Última etapa: entrega agendada, resumo do envio e confirmação do pedido.
async function confirmOrder(option, date) {
 await say(`Óptimo! Vamos agendar a entrega para ${display(date)}.`);
 const card=document.createElement('section');card.className='scheduled';
 card.innerHTML=`<h3>${svgIcon(icons.calendar)}<span>ENTREGA AGENDADA</span></h3><strong></strong><p>Estará em casa nesta data para receber o cartão.</p><button type="button">${svgIcon(icons.pencil)}<span>Alterar data de entrega</span></button>`;
 card.querySelector('strong').textContent=display(date);
 const change=card.querySelector('button');
 messages.append(card);scrollEnd();
 await say('Está tudo pronto do meu lado.');
 await say('É só confirmar o pedido para receber o cartão na sua morada.');
 const kind=option.name.replace('Envio ','envio ').toLowerCase();
 const order=document.createElement('div');order.className='order';
 order.innerHTML=`<p class="order-fee">${svgIcon(icons.shield)}<span></span></p><section class="order-summary"><h3>${svgIcon(icons.box)}<span></span></h3><ul></ul></section><button type="button" class="order-confirm">Confirmar pedido</button>`;
 order.querySelector('.order-fee span').textContent=`Taxa única de ${option.price} — ${kind}.`;
 order.querySelector('.order-summary h3 span').textContent=`RESUMO DO ${kind.toUpperCase()}`;
 [[icons.calendar,'Data agendada:',display(date)],[icons.shield,'Prazo estimado:',`${option.days}, com envio registado e seguido.`],[icons.badge,'Inclui:','cartão físico, código PIN e manual de activação.'],[icons.pin,'Morada:',answers.address||'']].forEach(([icon,label,text])=>{
  const li=document.createElement('li');li.innerHTML=`${svgIcon(icon)}<span><b></b> </span>`;li.querySelector('b').textContent=label;li.lastChild.append(text);order.querySelector('ul').append(li);
 });
 change.onclick=async()=>{
  if(busy)return;busy=true;change.disabled=true;composer.replaceChildren();composer.classList.remove('order-mode');
  await chooseDeliveryDate(option,true);
 };
 order.querySelector('.order-confirm').onclick=async()=>{
  if(busy)return;busy=true;change.disabled=true;answers.order='confirmado';composer.replaceChildren();composer.classList.remove('order-mode');bubble('Confirmar pedido',true);
  const order={
   name:[answers.firstName,answers.surname].filter(Boolean).join(' '),
   address:answers.address,deliveryDate:answers.deliveryDate,
   shipping:option.name,shippingPrice:option.price,shippingDays:option.days,
   credit:answers.initialCredit ? answers.initialCredit.split(' — ')[0] : ''
  };
  try { sessionStorage.setItem('novaCardOrder',JSON.stringify(order)); } catch (_) {}
  window.location.assign('pagamento.html'+window.location.search);
 };
 composer.classList.add('order-mode');composer.append(order);busy=false;scrollEnd();
}
// Fase final: agendamento da entrega num calendário (datas a partir do prazo mínimo do envio escolhido).
async function chooseDeliveryDate(option, again=false) {
 if(!again) for(const text of ['Para garantir a entrega do seu cartão, escolha uma data em que estará em casa para o receber.','A entrega é feita no prazo indicado para o método de envio escolhido. Pode escolher qualquer data nas próximas semanas.']) await say(text);
 const today=new Date();today.setHours(0,0,0,0);
 const first=new Date(today);first.setDate(first.getDate()+option.minDays);
 const last=new Date(today);last.setDate(last.getDate()+70);
 const sameDay=(a,b)=>a&&b&&a.toDateString()===b.toDateString();
 let chosen=null,view=new Date(first.getFullYear(),first.getMonth(),1);
 const box=document.createElement('div');box.className='delivery';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='delivery-trigger';trigger.setAttribute('aria-expanded','false');
 trigger.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg><span>Toque para escolher a data de entrega</span>';
 const calendar=document.createElement('div');calendar.className='delivery-calendar';calendar.hidden=true;calendar.setAttribute('aria-label','Escolher data de entrega');
 const confirm=document.createElement('button');confirm.type='button';confirm.className='delivery-confirm';confirm.disabled=true;
 confirm.innerHTML='<span>Confirmar agendamento</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V4m-7 7 7-7 7 7"/></svg>';
 const close=()=>{calendar.hidden=true;trigger.setAttribute('aria-expanded','false');};
 function render(){
  calendar.replaceChildren();
  const top=document.createElement('div');top.className='delivery-top';
  const month=view.toLocaleString('en-US',{month:'long'})+' '+view.getFullYear();
  const previous=button('‹',()=>{if(view<=new Date(today.getFullYear(),today.getMonth(),1))return;view=new Date(view.getFullYear(),view.getMonth()-1,1);render();});previous.setAttribute('aria-label','Mês anterior');
  const next=button('›',()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);render();});next.setAttribute('aria-label','Mês seguinte');
  // A seta '‹' mantém o aspecto activo (como na captura), mas não recua antes do mês actual.
  next.disabled=view>=new Date(last.getFullYear(),last.getMonth(),1);
  const label=document.createElement('strong');label.textContent=month;top.append(previous,label,next);calendar.append(top);
  const grid=document.createElement('div');grid.className='delivery-grid';
  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(day=>{const span=document.createElement('span');span.textContent=day;grid.append(span);});
  const offset=view.getDay();const length=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
  for(let i=0;i<Math.ceil((offset+length)/7)*7;i++){
   const date=new Date(view.getFullYear(),view.getMonth(),i-offset+1);
   const b=document.createElement('button');b.type='button';b.textContent=date.getDate();
   b.disabled=date<first||date>last;
   b.className=(sameDay(date,today)?'today ':'')+(sameDay(date,chosen)?'selected':'');
   b.setAttribute('aria-label',display(date));
   b.onclick=()=>{chosen=date;trigger.querySelector('span').textContent=display(date);trigger.classList.add('filled');confirm.disabled=false;close();};
   grid.append(b);
  }
  calendar.append(grid);
 }
 trigger.onclick=()=>{calendar.hidden=!calendar.hidden;trigger.setAttribute('aria-expanded',String(!calendar.hidden));if(!calendar.hidden)render();};
 const outside=event=>{if(!box.contains(event.target))close();};document.addEventListener('pointerdown',outside);
 calendar.addEventListener('keydown',event=>{if(event.key==='Escape'){close();trigger.focus();}});
 confirm.onclick=async()=>{
  if(busy||!chosen)return;busy=true;answers.deliveryDate=display(chosen);document.removeEventListener('pointerdown',outside);
  composer.replaceChildren();composer.classList.remove('delivery-mode');bubble(isoDate(chosen),true);
  await confirmOrder(option,chosen);
 };
 box.append(calendar,trigger,confirm);composer.classList.add('delivery-mode');composer.append(box);busy=false;scrollEnd();
}
function audioBubble() {
 const row=document.createElement('div');row.className='bubble audio';
 const play=document.createElement('button');play.innerHTML='<svg viewBox="0 0 24 24"><path d="m8 4 12 8-12 8Z"/></svg>';play.setAttribute('aria-label',AUDIO_URL?'Reproduzir áudio':'Áudio ainda não disponível');
 const center=document.createElement('div');center.className='audio-center';center.innerHTML='<div class="audio-track"></div><div class="audio-info"><span class="audio-time">0:00</span><span>Áudio</span></div>';
 const avatar=document.createElement('img');avatar.src='assets/katy-audio-avatar-2x.png';avatar.alt='Katy';row.append(play,center,avatar);messages.append(row);
 if(AUDIO_URL){
  const audio=new Audio(AUDIO_URL);audio.preload='auto';
  const time=center.querySelector('.audio-time');const track=center.querySelector('.audio-track');
  const fill=document.createElement('div');fill.className='audio-progress';track.append(fill);
  const formatTime=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
  const pauseIcon='<svg viewBox="0 0 24 24"><path d="M7 4h4v16H7zM13 4h4v16h-4z"/></svg>';const playIcon=play.innerHTML;
  // Mostra a contagem: tempo decorrido durante a reprodução e barra de progresso.
  const update=()=>{const d=audio.duration;time.textContent=formatTime(audio.currentTime);fill.style.width=Number.isFinite(d)&&d>0?(audio.currentTime/d*100)+'%':'0%';};
  audio.addEventListener('loadedmetadata',()=>{if(Number.isFinite(audio.duration)&&audio.paused)time.textContent=formatTime(audio.duration);});
  audio.addEventListener('timeupdate',update);
  audio.addEventListener('play',()=>{play.innerHTML=pauseIcon;play.setAttribute('aria-label','Pausar áudio');});
  audio.addEventListener('pause',()=>{play.innerHTML=playIcon;play.setAttribute('aria-label','Reproduzir áudio');});
  audio.addEventListener('ended',()=>{fill.style.width='100%';if(Number.isFinite(audio.duration))time.textContent=formatTime(audio.duration);});
  play.addEventListener('click',()=>{if(audio.paused)audio.play().catch(()=>{});else audio.pause();});
  track.addEventListener('click',e=>{if(!Number.isFinite(audio.duration))return;const r=track.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*audio.duration;update();});
  // Reprodução automática; se o navegador bloquear, começa no primeiro toque/tecla do utilizador.
  const events=['pointerdown','touchstart','keydown'];
  const unlock=e=>{events.forEach(t=>document.removeEventListener(t,unlock,true));if(play.contains(e.target))return;if(audio.paused&&!audio.ended&&audio.currentTime===0)audio.play().catch(()=>{});};
  audio.play().catch(()=>events.forEach(t=>document.addEventListener(t,unlock,true)));
 }
 else play.addEventListener('click',()=>{if(!row.querySelector('.audio-pending')){const note=document.createElement('small');note.className='audio-pending';note.textContent='Áudio ainda não disponível.';center.append(note);scrollEnd();}});
 scrollEnd();
}
async function start() {
 await say('Olá! Ouça este áudio rapidinho:');
 // Como no WhatsApp: pequena pausa, "a gravar áudio…" no topo e só depois chega o áudio.
 await delay(jitter(600, 900));presence.textContent='a gravar áudio…';await delay(jitter(2200, 2800));
 audioBubble();presence.textContent='online';await delay(jitter(1500, 2200));lastBot=0;
 await say('Pré-avaliação rápida — 2 minutos. Podemos começar?');
 composer.append(button('Começar',async()=>{if(busy)return;busy=true;composer.replaceChildren();bubble('Começar',true);await ask(0);}));
}
start();
