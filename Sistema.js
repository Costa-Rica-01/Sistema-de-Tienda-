'use strict';
const $ = id => document.getElementById(id);
const KEY = 'sistemaComercial91_data_v1';
const money = n => new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:2}).format(Number(n)||0);
const today = () => new Date().toISOString().slice(0,10);
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let db = loadDB();
let cart = [];

function loadDB(){
  try { const saved=JSON.parse(localStorage.getItem(KEY)); if(saved && Array.isArray(saved.products)&&Array.isArray(saved.sales)&&Array.isArray(saved.expenses)) return saved; } catch(e){}
  return {products:[],sales:[],expenses:[]};
}
function saveDB(){ localStorage.setItem(KEY,JSON.stringify(db)); renderAll(); }
function toast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2600); }
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function emptyRow(cols,msg='SIN REGISTROS'){return `<tr><td colspan="${cols}" class="empty">${msg}</td></tr>`;}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===id));if(id==='reports')renderReport();}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$('today').textContent=new Date().toLocaleDateString('es-CR');
$('expenseDate').value=today();
$('reportMonth').value=today().slice(0,7);
$('invoiceNo').textContent='FAC-'+today().replaceAll('-','')+'-'+String(Date.now()).slice(-4);

function renderDashboard(){
 const now=today(), month=now.slice(0,7);
 const todays=db.sales.filter(s=>s.date===now), monthly=db.sales.filter(s=>s.date.startsWith(month));
 $('statToday').textContent=money(todays.reduce((a,s)=>a+s.total,0));
 $('countToday').textContent=todays.length+' transacciones';
 $('statMonth').textContent=money(monthly.reduce((a,s)=>a+s.total,0));
 $('statStock').textContent=money(db.products.reduce((a,p)=>a+p.cost*p.stock,0));
 const low=db.products.filter(p=>p.stock<=p.min);
 $('statLow').textContent=low.length;
 $('recentSales').innerHTML=db.sales.slice().reverse().slice(0,7).map(s=>`<tr><td>${esc(s.date)}</td><td>${esc(s.invoice)}</td><td>${money(s.total)}</td></tr>`).join('')||emptyRow(3,'TODAVÃA NO HAY VENTAS');
 $('lowList').innerHTML=low.slice(0,8).map(p=>`<div class="alert-item"><b>${esc(p.name)}</b> â€” quedan ${p.stock} unidades (mÃ­nimo ${p.min})</div>`).join('')||'<div class="empty">NO HAY ALERTAS DE STOCK</div>';
}
function renderPicker(){
 const q=$('saleSearch').value.toLowerCase();
 const list=db.products.filter(p=>(p.name+' '+p.code).toLowerCase().includes(q));
 $('pickerRows').innerHTML=list.map(p=>`<tr><td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td><button class="button small-btn" data-add="${p.id}" ${p.stock<=0?'disabled':''}>AÃ‘ADIR</button></td></tr>`).join('')||emptyRow(5,'NO SE ENCONTRARON PRODUCTOS');
}
function renderCart(){
 $('cartRows').innerHTML=cart.map(i=>`<tr><td>${esc(i.name)}</td><td><button class="button small-btn" data-qty="${i.id}" data-delta="-1">âˆ’</button> ${i.qty} <button class="button small-btn" data-qty="${i.id}" data-delta="1">+</button></td><td>${money(i.price)}</td><td>${money(i.price*i.qty)}</td><td><button class="button danger small-btn" data-remove="${i.id}">X</button></td></tr>`).join('')||emptyRow(5,'FACTURA VACÃA');
 $('cartTotal').textContent=money(cart.reduce((a,i)=>a+i.price*i.qty,0));
}
$('saleSearch').addEventListener('input',renderPicker);
$('pickerRows').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;const p=db.products.find(x=>x.id===b.dataset.add);if(!p||p.stock<=0)return toast('Producto sin existencias');const item=cart.find(x=>x.id===p.id);if(item){if(item.qty>=p.stock)return toast('No hay suficiente stock');item.qty++;}else cart.push({id:p.id,name:p.name,price:p.price,cost:p.cost,qty:1});renderCart();});
$('cartRows').addEventListener('click',e=>{
 const q=e.target.closest('[data-qty]'),r=e.target.closest('[data-remove]');
 if(r){cart=cart.filter(i=>i.id!==r.dataset.remove);renderCart();return;}
 if(q){const item=cart.find(i=>i.id===q.dataset.qty),p=db.products.find(x=>x.id===item.id);const next=item.qty+Number(q.dataset.delta);if(next<1)cart=cart.filter(i=>i.id!==item.id);else if(next>p.stock)toast('No hay suficiente stock');else item.qty=next;renderCart();}
});
$('clearCart').addEventListener('click',()=>{cart=[];renderCart();});
$('completeSale').addEventListener('click',()=>{
 if(!cart.length)return toast('Agregue productos a la factura');
 for(const i of cart){const p=db.products.find(x=>x.id===i.id);if(!p||p.stock<i.qty)return toast('Stock insuficiente para '+i.name);}
 const total=cart.reduce((a,i)=>a+i.price*i.qty,0),cost=cart.reduce((a,i)=>a+i.cost*i.qty,0);
 const sale={id:uid(),invoice:$('invoiceNo').textContent,date:today(),items:cart.map(i=>({...i})),total,cost,payment:$('paymentMethod').value};
 cart.forEach(i=>{const p=db.products.find(x=>x.id===i.id);p.stock-=i.qty;});
 db.sales.push(sale);cart=[];saveDB();renderPicker();renderCart();$('invoiceNo').textContent='FAC-'+today().replaceAll('-','')+'-'+String(Date.now()).slice(-4);
 toast('Venta registrada correctamente Â· '+money(total));
});
function resetProduct(){ $('productForm').reset();$('editId').value='';$('pMin').value=5;$('saveProduct').textContent='GUARDAR PRODUCTO'; }
$('resetProduct').addEventListener('click',resetProduct);
$('productForm').addEventListener('submit',e=>{
 e.preventDefault();const id=$('editId').value,code=$('pCode').value.trim(),name=$('pName').value.trim();
 const cost=Number($('pCost').value),price=Number($('pPrice').value),stock=Number($('pStock').value),min=Number($('pMin').value);
 if(!code||!name||![cost,price,stock,min].every(Number.isFinite)||cost<0||price<0||stock<0||min<0)return toast('Revise los datos ingresados');
 if(db.products.some(p=>p.code.toLowerCase()===code.toLowerCase()&&p.id!==id))return toast('Ese cÃ³digo ya existe');
 if(id){const p=db.products.find(x=>x.id===id);Object.assign(p,{code,name,category:$('pCategory').value.trim(),cost,price,stock,min});}
 else db.products.push({id:uid(),code,name,category:$('pCategory').value.trim(),cost,price,stock,min});
 saveDB();resetProduct();renderPicker();toast('Producto guardado');
});
function renderInventory(){
 const q=$('inventorySearch').value.toLowerCase();
 const list=db.products.filter(p=>(p.name+' '+p.code+' '+p.category).toLowerCase().includes(q));
 $('inventoryRows').innerHTML=list.map(p=>`<tr><td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td><b>${p.stock}</b>${p.stock<=p.min?' âš ':''}</td><td>${money(p.cost*p.stock)}</td><td><button class="button small-btn" data-edit="${p.id}">EDITAR</button> <button class="button danger small-btn" data-delete="${p.id}">BORRAR</button></td></tr>`).join('')||emptyRow(8,'NO HAY PRODUCTOS REGISTRADOS');
}
$('inventorySearch').addEventListener('input',renderInventory);
$('inventoryRows').addEventListener('click',e=>{
 const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');
 if(edit){const p=db.products.find(x=>x.id===edit.dataset.edit);$('editId').value=p.id;$('pCode').value=p.code;$('pName').value=p.name;$('pCategory').value=p.category;$('pCost').value=p.cost;$('pPrice').value=p.price;$('pStock').value=p.stock;$('pMin').value=p.min;$('saveProduct').textContent='ACTUALIZAR PRODUCTO';$('productForm').scrollIntoView({behavior:'smooth'});}
 if(del){const p=db.products.find(x=>x.id===del.dataset.delete);if(!confirm(`Â¿Borrar ${p.name}?`))return;db.products=db.products.filter(x=>x.id!==p.id);saveDB();renderPicker();toast('Producto eliminado');}
});
$('expenseForm').addEventListener('submit',e=>{e.preventDefault();const amount=Number($('expenseAmount').value);if(!Number.isFinite(amount)||amount<=0)return toast('Ingrese un monto vÃ¡lido');db.expenses.push({id:uid(),date:$('expenseDate').value,name:$('expenseName').value.trim(),category:$('expenseCategory').value,amount});saveDB();$('expenseName').value='';$('expenseAmount').value='';toast('Gasto registrado');});
function renderExpenses(){
 $('expenseRows').innerHTML=db.expenses.slice().reverse().map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${money(x.amount)}</td><td><button class="button danger small-btn" data-expense-delete="${x.id}">BORRAR</button></td></tr>`).join('')||emptyRow(5);
}
$('expenseRows').addEventListener('click',e=>{const b=e.target.closest('[data-expense-delete]');if(!b)return;if(!confirm('Â¿Eliminar este gasto?'))return;db.expenses=db.expenses.filter(x=>x.id!==b.dataset.expenseDelete);saveDB();});
function renderReport(){
 const month=$('reportMonth').value||today().slice(0,7),sales=db.sales.filter(s=>s.date.startsWith(month)),expenses=db.expenses.filter(x=>x.date.startsWith(month));
 const total=sales.reduce((a,s)=>a+s.total,0),cost=sales.reduce((a,s)=>a+s.cost,0),gross=total-cost,exp=expenses.reduce((a,x)=>a+x.amount,0);
 $('rSales').textContent=money(total);$('rCost').textContent=money(cost);$('rProfit').textContent=money(gross);$('rExpenses').textContent=money(exp);$('rGross').textContent=money(gross);$('rMinus').textContent=money(exp);$('rNet').textContent=money(gross-exp);
 $('reportSalesRows').innerHTML=sales.slice().reverse().map(s=>`<tr><td>${esc(s.date)}</td><td>${esc(s.invoice)}</td><td>${s.items.reduce((a,i)=>a+i.qty,0)}</td><td>${esc(s.payment)}</td><td>${money(s.total)}</td><td>${money(s.cost)}</td><td>${money(s.total-s.cost)}</td></tr>`).join('')||emptyRow(7,'NO HAY VENTAS EN ESTE MES');
}
$('refreshReport').addEventListener('click',renderReport);$('reportMonth').addEventListener('change',renderReport);
function renderAll(){renderDashboard();renderInventory();renderExpenses();renderPicker();renderCart();renderReport();}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
$('exportData').addEventListener('click',()=>download('respaldo-sistema-comercial-91-'+today()+'.json',JSON.stringify(db,null,2),'application/json'));
$('importData').addEventListener('click',()=>{const f=$('importFile').files[0];if(!f)return toast('Seleccione un archivo JSON');const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result);if(!x||!Array.isArray(x.products)||!Array.isArray(x.sales)||!Array.isArray(x.expenses))throw Error();if(!confirm('Esto reemplazarÃ¡ los datos actuales. Â¿Continuar?'))return;db=x;saveDB();cart=[];renderCart();toast('Respaldo restaurado');}catch(e){toast('Archivo invÃ¡lido o daÃ±ado');}};reader.readAsText(f);});
function csv(rows){return '\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n');}
$('exportProducts').addEventListener('click',()=>download('inventario.csv',csv([['CÃ³digo','Producto','CategorÃ­a','Costo','Precio','Stock','MÃ­nimo'],...db.products.map(p=>[p.code,p.name,p.category,p.cost,p.price,p.stock,p.min])]),'text/csv;charset=utf-8'));
$('exportSales').addEventListener('click',()=>download('ventas.csv',csv([['Fecha','Factura','Total','Costo','Ganancia','Pago'],...db.sales.map(s=>[s.date,s.invoice,s.total,s.cost,s.total-s.cost,s.payment])]),'text/csv;charset=utf-8'));
$('exportExpenses').addEventListener('click',()=>download('gastos.csv',csv([['Fecha','DescripciÃ³n','CategorÃ­a','Monto'],...db.expenses.map(x=>[x.date,x.name,x.category,x.amount])]),'text/csv;charset=utf-8'));
renderAll();