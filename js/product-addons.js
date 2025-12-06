;(function(){
  const TYPES=[
    {v:'',t:'Select field type'},
    {v:'heading',t:'Heading'},
    {v:'text',t:'Text field'},
    {v:'textarea',t:'Long text / notes'},
    {v:'email',t:'Email'},
    {v:'file',t:'File upload'},
    {v:'radio',t:'Radio buttons'},
    {v:'select',t:'Dropdown list'},
    {v:'checkbox_group',t:'Checkbox group'}
  ];
  const DEMO=[
    {type:'select',label:'How many photos do you want to use?',options:[
      {label:'Do not include photo',price:0,default:true},
      {label:'1 photo',price:0,file:true,fileQuantity:1},
      {label:'2 photos',price:2000,file:true,fileQuantity:2},
      {label:'3 photos',price:3100,file:true,fileQuantity:3}
    ]},
    {type:'textarea',label:'What shall we say',placeholder:'e.g. Happy birthday video for Ayesha',required:true},
    {type:'radio',label:'Choose song',options:[
      {label:'We choose it for you (faster & funnier)',price:0,default:true},
      {label:'I want my own music',price:0,textField:true,textLabel:'Song link or details',textPlaceholder:'Paste link or describe song'}
    ]},
    {type:'radio',label:'Delivery time',options:[
      {label:'Standard delivery (Free)',price:0,default:true},
      {label:'1 Day delivery',price:3500,default:false}
    ]},
    {type:'checkbox_group',label:'Extras',options:[
      {label:'Funny video cut',price:3500},
      {label:'Sing happy birthday',price:3500},
      {label:'Permission to post on social media',price:0}
    ]},
    {type:'email',label:'Email address',placeholder:'Where we send the video',required:true}
  ];
  function slug(str,i){
    const b=(str||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return b||'field_'+i;
  }
  function num(v){if(!v)return 0;const n=parseFloat(v);return Number.isNaN(n)?0:n;}
  function intVal(v){if(!v)return 0;const n=parseInt(v,10);return Number.isNaN(n)?0:n;}
  function escapeAttr(s){return (s||'').replace(/"/g,'&quot;');}
  function initAddonsBuilder(form){
    const builder=form.querySelector('#addons-builder');
    if(!builder)return;
    const list=builder.querySelector('#addons-fields');
    const addBtn=builder.querySelector('#add-addon-field');
    const hidden=builder.querySelector('#addons-json');
    if(!list||!addBtn||!hidden)return;
    let counter=1;
    addBtn.addEventListener('click',()=>{list.appendChild(createFieldRow(counter++));syncHidden(form);});
    builder.addEventListener('click',e=>{
      const t=e.target;
      if(t.matches('.addon-remove-field')){t.closest('.addon-field')?.remove();syncHidden(form);}
      if(t.matches('.addon-add-option')){
        const field=t.closest('.addon-field');
        const wrap=field?.querySelector('.addon-options');
        if(wrap){wrap.appendChild(createOptionRow());syncHidden(form);}
      }
      if(t.matches('.addon-remove-option')){
        t.closest('.addon-option-row')?.remove();
        syncHidden(form);
      }
    });
    builder.addEventListener('change',e=>{
      const t=e.target;
      if(t.matches('.addon-type')){
        const field=t.closest('.addon-field');
        renderTypeConfig(field);
      }
      if(t.matches('.addon-opt-file')||t.matches('.addon-opt-text')){
        const row=t.closest('.addon-option-row');
        updateOptionVisibility(row);
      }
      syncHidden(form);
    });
    builder.addEventListener('input',()=>syncHidden(form));
    if(!hidden.value){
      seedDemo(list,counter);
      syncHidden(form);
    }
  }
  function createFieldRow(index){
    const w=document.createElement('div');
    w.className='addon-field';
    w.dataset.index=String(index);
    const opts=TYPES.map(t=>`<option value="${t.v}">${t.t}</option>`).join('');
    w.innerHTML=[
      '<div class="addon-row-header">',
      '  <div class="addon-row-main">',
      '    <label>Field type',
      `      <select class="addon-type">${opts}</select>`,
      '    </label>',
      '    <label class="addon-label-wrap">Label',
      '      <input type="text" class="addon-label" placeholder="e.g. Choose song">',
      '    </label>',
      '  </div>',
      '  <button type="button" class="btn btn-secondary addon-remove-field">Remove</button>',
      '</div>',
      '<div class="addon-row-config"><p class="field-note">Field type select karo, phir yahan uski settings nazar aayengi.</p></div>'
    ].join('\n');
    return w;
  }
  function renderTypeConfig(field){
    if(!field)return;
    const type=field.querySelector('.addon-type')?.value||'';
    const cfg=field.querySelector('.addon-row-config');
    if(!cfg)return;
    if(!type){
      cfg.innerHTML='<p class="field-note">Field type select karo, phir yahan uski settings nazar aayengi.</p>';
      return;
    }
    if(type==='heading'){
      const lbl=field.querySelector('.addon-label')?.value||'';
      cfg.innerHTML=[
        '<div class="form-field">',
        '  <span class="field-note">Heading sirf text show karega, koi input nahi.</span>',
        `  <label>Heading text<input type="text" class="addon-heading-text" value="${escapeAttr(lbl)}" placeholder="Section heading"></label>`,
        '</div>'
      ].join('');
      return;
    }
    if(type==='text'||type==='textarea'||type==='email'){
      cfg.innerHTML=[
        '<div class="form-grid-2">',
        '  <div class="form-field">',
        '    <label>Placeholder<input type="text" class="addon-placeholder" placeholder="Optional placeholder"></label>',
        '  </div>',
        '  <div class="form-field">',
        '    <label>Extra price<input type="number" step="0.01" class="addon-price" value="0"></label>',
        '  </div>',
        '</div>',
        '<div class="form-field form-field-inline"><label><input type="checkbox" class="addon-required"> Required</label></div>'
      ].join('');
      return;
    }
    if(type==='file'){
      cfg.innerHTML=[
        '<div class="form-grid-2">',
        '  <div class="form-field"><label>Price per file / unit<input type="number" step="0.01" class="addon-file-price" value="0"></label></div>',
        '  <div class="form-field form-field-inline"><label><input type="checkbox" class="addon-required"> Required</label></div>',
        '</div>',
        '<div class="form-grid-2">',
        '  <div class="form-field form-field-inline"><label><input type="checkbox" class="addon-file-multi"> Allow multiple files</label></div>',
        '  <div class="form-field form-field-inline"><label><input type="checkbox" class="addon-file-qty"> Ask for quantity</label></div>',
        '</div>'
      ].join('');
      return;
    }
    if(type==='radio'||type==='select'||type==='checkbox_group'){
      cfg.innerHTML=[
        '<p class="field-note">Har option ke saath price, file quantity aur optional text field ka control hai.</p>',
        '<div class="addon-options"></div>',
        '<button type="button" class="btn btn-secondary addon-add-option">Add option</button>'
      ].join('');
      const wrap=field.querySelector('.addon-options');
      if(wrap&&!wrap.querySelector('.addon-option-row'))wrap.appendChild(createOptionRow());
      return;
    }
  }
  function createOptionRow(){
    const row=document.createElement('div');
    row.className='addon-option-row';
    row.innerHTML=[
      '<div class="form-grid-2 addon-option-main">',
      '  <div class="form-field"><label>Option label<input type="text" class="addon-opt-label" placeholder="e.g. 1 photo"></label></div>',
      '  <div class="form-field"><label>Extra price<input type="number" step="0.01" class="addon-opt-price" value="0"></label></div>',
      '</div>',
      '<div class="addon-option-flags">',
      '  <label><input type="checkbox" class="addon-opt-file"> File</label>',
      '  <label><input type="checkbox" class="addon-opt-text"> Text field</label>',
      '  <label><input type="checkbox" class="addon-opt-default"> Default</label>',
      '  <button type="button" class="btn btn-secondary addon-remove-option">Remove</button>',
      '</div>',
      '<div class="addon-option-config" style="display:none">',
      '  <div class="form-grid-2 opt-file-config" style="display:none">',
      '    <div class="form-field"><label>File quantity<input type="number" min="1" class="addon-opt-fileqty" value="1"></label></div>',
      '  </div>',
      '  <div class="form-grid-2 opt-text-config" style="display:none">',
      '    <div class="form-field"><label>Text field label<input type="text" class="addon-opt-textlabel" placeholder="Label for extra text"></label></div>',
      '    <div class="form-field"><label>Text placeholder<input type="text" class="addon-opt-textph" placeholder="Placeholder"></label></div>',
      '  </div>',
      '</div>'
    ].join('');
    return row;
  }
  function updateOptionVisibility(row){
    if(!row)return;
    const hasFile=row.querySelector('.addon-opt-file')?.checked;
    const hasText=row.querySelector('.addon-opt-text')?.checked;
    const cfg=row.querySelector('.addon-option-config');
    const fileCfg=row.querySelector('.opt-file-config');
    const textCfg=row.querySelector('.opt-text-config');
    if(cfg)cfg.style.display=hasFile||hasText?'block':'none';
    if(fileCfg)fileCfg.style.display=hasFile?'grid':'none';
    if(textCfg)textCfg.style.display=hasText?'grid':'none';
  }
  function buildConfig(form){
    const out=[];
    const builder=form.querySelector('#addons-builder');
    if(!builder)return out;
    const fields=builder.querySelectorAll('.addon-field');
    fields.forEach((field,idx)=>{
      const type=field.querySelector('.addon-type')?.value||'';
      const label=(field.querySelector('.addon-label')?.value||'').trim();
      if(!type)return;
      if(!label&&type!=='heading')return;
      const id=slug(label,idx+1);
      const f={id,type,label};
      if(type==='heading'){
        const txt=(field.querySelector('.addon-heading-text')?.value||label).trim();
        f.text=txt;
      }else if(type==='text'||type==='textarea'||type==='email'){
        f.placeholder=(field.querySelector('.addon-placeholder')?.value||'').trim();
        f.price=num(field.querySelector('.addon-price')?.value);
        f.required=!!field.querySelector('.addon-required')?.checked;
      }else if(type==='file'){
        f.file={
          pricePerUnit:num(field.querySelector('.addon-file-price')?.value),
          multiple:!!field.querySelector('.addon-file-multi')?.checked,
          askQuantity:!!field.querySelector('.addon-file-qty')?.checked
        };
        f.required=!!field.querySelector('.addon-required')?.checked;
      }else if(type==='radio'||type==='select'||type==='checkbox_group'){
        const opts=[];
        field.querySelectorAll('.addon-option-row').forEach(row=>{
          const lab=(row.querySelector('.addon-opt-label')?.value||'').trim();
          if(!lab)return;
          const o={
            label:lab,
            price:num(row.querySelector('.addon-opt-price')?.value),
            file:!!row.querySelector('.addon-opt-file')?.checked,
            textField:!!row.querySelector('.addon-opt-text')?.checked,
            default:!!row.querySelector('.addon-opt-default')?.checked
          };
          if(o.file)o.fileQuantity=intVal(row.querySelector('.addon-opt-fileqty')?.value)||1;
          if(o.textField){
            o.textLabel=(row.querySelector('.addon-opt-textlabel')?.value||'').trim();
            o.textPlaceholder=(row.querySelector('.addon-opt-textph')?.value||'').trim();
          }
          opts.push(o);
        });
        if(!opts.length)return;
        f.options=opts;
      }
      out.push(f);
    });
    return out;
  }
  function syncHidden(form){
    const hidden=form.querySelector('#addons-json');
    if(!hidden)return;
    const cfg=buildConfig(form);
    hidden.value=cfg.length?JSON.stringify(cfg):'';
  }
  function seedDemo(list,counter){
    DEMO.forEach((f,idx)=>{
      const field=createFieldRow(counter+idx);
      list.appendChild(field);
      const typeSel=field.querySelector('.addon-type');
      const labelInput=field.querySelector('.addon-label');
      if(typeSel){
        typeSel.value=f.type;
        labelInput.value=f.label;
        renderTypeConfig(field);
      }
      if(f.type==='text'||f.type==='textarea'||f.type==='email'){
        if(f.placeholder)field.querySelector('.addon-placeholder').value=f.placeholder;
        if(f.required)field.querySelector('.addon-required').checked=true;
      }
      if(f.type==='radio'||f.type==='select'||f.type==='checkbox_group'){
        const wrap=field.querySelector('.addon-options');
        wrap.innerHTML='';
        f.options.forEach(opt=>{
          const row=createOptionRow();
          wrap.appendChild(row);
          row.querySelector('.addon-opt-label').value=opt.label;
          row.querySelector('.addon-opt-price').value=opt.price||0;
          if(opt.file)row.querySelector('.addon-opt-file').checked=true;
          if(opt.textField)row.querySelector('.addon-opt-text').checked=true;
          if(opt.default)row.querySelector('.addon-opt-default').checked=true;
          updateOptionVisibility(row);
          if(opt.file && opt.fileQuantity){row.querySelector('.addon-opt-fileqty').value=opt.fileQuantity;}
          if(opt.textField){
            if(opt.textLabel)row.querySelector('.addon-opt-textlabel').value=opt.textLabel;
            if(opt.textPlaceholder)row.querySelector('.addon-opt-textph').value=opt.textPlaceholder;
          }
        });
      }
    });
  }
  window.initAddonsBuilder=initAddonsBuilder;
  window.readAddonsConfig=function(form){return buildConfig(form);};
})();