/* Admin Dashboard Script */
const SCRIPT_FILE = 'script.js';

// خيارات enum محددة لكل قسم - النوع فقط للسوق، والفئة حسب القسم
const SECTION_ENUM_OPTIONS = {
  marketplace: {
    type: ['bots', 'sites', 'services'],
    category: ['بروكسيات', 'أرقام مؤقتة', 'أرقام دائمة', 'حسابات استبيانات', 'وسطاء', 'خدمات أخرى', 'أمان رقمي', 'أدوات رقمية', 'ربح من الإنترنت', 'أدوات', 'كورسات', 'قنوات يوتيوب']
  },
  promotions: {
    // لا توجد خيارات enum للنوع - إدخال يدوي
  },
  tools: {
    // لا توجد خيارات enum للنوع - إدخال يدوي
  },
  apps: {
    // لا توجد خيارات enum للنوع - إدخال يدوي
  },
  courses: {
    category: ['كورسات']
  },
  articles: {
    // لا توجد خيارات enum محددة للمقالات حالياً
  }
};

// ترتيب ثابت للحقول لكل قسم لضمان الاتساق
const SECTION_FIELD_ORDER = {
  marketplace: ['id', 'title', 'description', 'provider', 'providerLogo', 'providerUrl', 'type', 'category', 'price', 'rating', 'features', 'isActive', 'kunGuarantee'],
  promotions: ['id', 'title', 'description', 'provider', 'providerLogo', 'providerUrl', 'type', 'validUntil', 'isActive', 'kunGuarantee'],
  tools: ['id', 'title', 'description', 'provider', 'providerLogo', 'providerUrl', 'type', 'category', 'price', 'rating', 'features', 'isActive', 'kunGuarantee'],
  apps: ['id', 'title', 'description', 'provider', 'providerLogo', 'providerUrl', 'type', 'category', 'price', 'rating', 'features', 'isActive', 'kunGuarantee'],
  courses: ['id', 'title', 'description', 'provider', 'providerLogo', 'providerUrl', 'category', 'price', 'rating', 'features', 'isActive', 'kunGuarantee'],
  articles: ['id', 'title', 'excerpt', 'content', 'author', 'publishDate', 'category', 'tags', 'readTime', 'isActive']
};

const AdminState = {
  originalScript: '',
  datasets: {
    marketplace: [],
    articles: [],
    courses: [],
    tools: [],
    apps: [],
    promotions: []
  },
  schema: {
    marketplace: {},
    articles: {},
    courses: {},
    tools: {},
    apps: {},
    promotions: {}
  },
  currentDataset: 'marketplace',
  currentFieldOrder: [], // Maintains consistent field order for table rendering
  relations: {}, // { dataset: [{fromField, toDataset, toField}] }
  constraints: {}, // { dataset: { field: { required, unique, type, maxLen } } }
};

const AdminUI = {
  toastTimer: null,
  showToast(msg, type='info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(()=> toast.classList.add('hidden'), 2500);
  },
  showConfirm(title, message, onOk) {
    const dlg = document.getElementById('confirmDialog');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const okBtn = document.getElementById('confirmOkBtn');
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    newOkBtn.addEventListener('click', ()=> {
      this.hideConfirm();
      onOk && onOk();
    });
    dlg.classList.remove('hidden');
  },
  hideConfirm() { document.getElementById('confirmDialog').classList.add('hidden'); },
};

async function readScriptFile() {
  const statusEl = document.getElementById('loadStatus');
  if (statusEl) statusEl.textContent = 'جاري القراءة...';
  const inputEl = document.getElementById('scriptPathInput');
  const chosenPath = (inputEl && inputEl.value && inputEl.value.trim()) ? inputEl.value.trim() : SCRIPT_FILE;
  const url = chosenPath + '?t=' + Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('timeout'), 8000);

  try {
    document.getElementById('scriptFileName').textContent = chosenPath;
    let res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    // محاولة مسار بديل إذا فشل
    if (!res.ok) {
      try {
        const altUrl = '/' + chosenPath + '?t=' + Date.now();
        res = await fetch(altUrl, { signal: controller.signal });
      } catch (e) {}
    }

    if (!res.ok) throw new Error('فشل قراءة ملف السكربت');
    const text = await res.text();
    AdminState.originalScript = text;
    if (statusEl) statusEl.textContent = 'تمت القراءة';
    AdminUI.showToast('تم تحميل السكربت بنجاح', 'success');
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('readScriptFile error:', e);
    if (statusEl) statusEl.textContent = 'فشل التحميل';
    AdminUI.showToast('تعذر تحميل ملف السكربت. تحقق من المسار/الخادم.', 'error');
    throw e;
  }
}

function findAssignment(script, varName) {
  const assignIdx = script.indexOf(varName + ' =');
  if (assignIdx === -1) return null;
  const startBracket = script.indexOf('[', assignIdx);
  if (startBracket === -1) return null;
  let i = startBracket;
  let depth = 0;
  let inStr = false; let strChar = '';
  let escaped = false;
  for (; i < script.length; i++) {
    const ch = script[i];
    if (inStr) {
      if (!escaped && ch === strChar) { inStr = false; strChar=''; }
      escaped = !escaped && ch === '\\' && strChar !== '`';
      continue;
    }
    if (ch === '"' || ch === '\'' || ch === '`') { inStr = true; strChar = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { const endIdx = i; const semi = script.indexOf(';', endIdx); return {start: startBracket, end: semi !== -1 ? semi : endIdx+1}; } }
  }
  return null;
}



function evalArrayText(arrText) {
  try {
    // Evaluate purely as JS array literal
    /* eslint no-eval: 0 */
    return eval('(' + arrText + ')');
  } catch (e) {
    console.warn('Eval failed, trying JSON parse', e);
    try { return JSON.parse(arrText); } catch(e2) { console.error('Parse failed', e2); return []; }
  }
}

function findAllAssignments(script, varName) {
  const results = [];
  let searchIdx = 0;
  while (true) {
    const assignIdx = script.indexOf(varName + ' =', searchIdx);
    if (assignIdx === -1) break;
    const startBracket = script.indexOf('[', assignIdx);
    if (startBracket === -1) { searchIdx = assignIdx + varName.length + 1; continue; }
    let i = startBracket;
    let depth = 0;
    let inStr = false; let strChar = '';
    let escaped = false;
    for (; i < script.length; i++) {
      const ch = script[i];
      if (inStr) {
        if (!escaped && ch === strChar) { inStr = false; strChar=''; }
        escaped = !escaped && ch === '\\' && strChar !== '`';
        continue;
      }
      if (ch === '"' || ch === '\'' || ch === '`') { inStr = true; strChar = ch; continue; }
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--; if (depth === 0) {
          const endIdx = i;
          const semi = script.indexOf(';', endIdx);
          results.push({ start: startBracket, end: semi !== -1 ? semi : endIdx + 1 });
          break;
        }
      }
    }
    searchIdx = startBracket + 1;
  }
  return results;
}

function extractDatasets() {
  const s = AdminState.originalScript;
  const names = ['marketplaceData','articlesData','coursesData','toolsData','appsData','promotionsData'];
  names.forEach(name => {
    const all = findAllAssignments(s, name);
    if (!all || all.length === 0) { console.warn('لم يتم العثور على تعيين للمصفوفة', name); return; }
    // اختر أفضل تعيين: أول غير فارغ، وإن لم يوجد فالأخير
    let chosenArr = [];
    for (let k = all.length - 1; k >= 0; k--) {
      const loc = all[k];
      const text = s.slice(loc.start, loc.end);
      const bracketOnly = text.trim().startsWith('[') ? text : text.slice(text.indexOf('['));
      const arr = evalArrayText(bracketOnly);
      if (Array.isArray(arr) && arr.length > 0) { chosenArr = arr; break; }
    }
    if (!Array.isArray(chosenArr) || chosenArr.length === 0) {
      const loc = all[all.length - 1];
      const text = s.slice(loc.start, loc.end);
      const bracketOnly = text.trim().startsWith('[') ? text : text.slice(text.indexOf('['));
      chosenArr = evalArrayText(bracketOnly);
    }
    const key = name.replace('Data','').replace('marketplace','marketplace').replace('articles','articles').replace('courses','courses').replace('tools','tools').replace('apps','apps').replace('promotions','promotions');
    AdminState.datasets[key] = Array.isArray(chosenArr) ? chosenArr : [];
  });
}

function updateDataStats() {
  const ds = AdminState.datasets;
  
  // Update individual stat values safely
  const statElements = [
    { id: 'stat-marketplace', value: ds.marketplace.length },
    { id: 'stat-articles', value: ds.articles.length },
    { id: 'stat-courses', value: ds.courses.length },
    { id: 'stat-tools', value: ds.tools.length },
    { id: 'stat-apps', value: ds.apps.length },
    { id: 'stat-promotions', value: ds.promotions.length }
  ];
  
  statElements.forEach(stat => {
    const element = document.getElementById(stat.id);
    if (element) {
      element.textContent = stat.value;
    }
  });
  
  // Update last update time safely
  const lastUpdateEl = document.getElementById('last-update');
  if (lastUpdateEl) {
    const now = new Date();
    const timeString = now.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    lastUpdateEl.textContent = `آخر تحديث: ${timeString}`;
  }
  
  // Perform data validation and update status safely
  const validationEl = document.getElementById('validation-status');
  if (validationEl) {
    const validationResults = validateAllData();
    
    if (validationResults.isValid) {
      validationEl.innerHTML = '<span class="material-icons" style="color: var(--success);">check_circle</span> حالة التحقق: البيانات صحيحة';
    } else {
      validationEl.innerHTML = `<span class="material-icons" style="color: var(--warning);">warning</span> حالة التحقق: ${validationResults.issues} مشكلة`;
    }
  }
  
  // Fallback: Update old loadStatus element if new elements are not available
  const loadStatusEl = document.getElementById('loadStatus');
  if (loadStatusEl && !document.getElementById('stat-marketplace')) {
    loadStatusEl.textContent = `بيانات محمّلة — سوق: ${ds.marketplace.length} | مقالات: ${ds.articles.length} | كورسات: ${ds.courses.length} | أدوات: ${ds.tools.length} | تطبيقات: ${ds.apps.length} | عروض: ${ds.promotions.length}`;
  }
}

function validateAllData() {
  let totalIssues = 0;
  
  try {
    const datasets = AdminState.datasets || {};
    
    // Check for missing required fields and data integrity
    Object.keys(datasets).forEach(datasetName => {
      const schema = AdminState.schema[datasetName] || {};
      const rows = datasets[datasetName] || [];
      
      if (!Array.isArray(rows)) return;
      
      rows.forEach((row, rowIndex) => {
        if (!row || typeof row !== 'object') return;
        
        // Check required fields
        Object.keys(schema).forEach(fieldName => {
          const field = schema[fieldName];
          if (field && field.required && (!row[fieldName] || row[fieldName] === '')) {
            totalIssues++;
          }
        });
        
        // Check for duplicate IDs if unique constraint exists
        Object.keys(schema).forEach(fieldName => {
          const field = schema[fieldName];
          if (field && field.unique && row[fieldName] !== null && row[fieldName] !== undefined) {
            const duplicates = rows.filter((r, i) => i !== rowIndex && r && r[fieldName] === row[fieldName]);
            if (duplicates.length > 0) {
              totalIssues++;
            }
          }
        });
      });
    });
  } catch (error) {
    console.warn('Error during data validation:', error);
    totalIssues = 1; // Mark as having issues if validation fails
  }
  
  return {
    isValid: totalIssues === 0,
    issues: totalIssues
  };
}
function buildSchemaFor(datasetName) {
  const rows = AdminState.datasets[datasetName] || [];
  const fields = {};
  rows.forEach(row => {
    Object.keys(row || {}).forEach(k => {
      const v = row[k];
      const t = Array.isArray(v) ? 'array' : (v===null? 'null': typeof v);
      fields[k] = fields[k] || { type: t, required: false, unique: false };
      if (fields[k].type !== t) fields[k].type = 'mixed';
    });
  });
  
  // تطبيق enum محدد لكل قسم
  const sectionEnums = SECTION_ENUM_OPTIONS[datasetName];
  if (sectionEnums) {
    Object.keys(sectionEnums).forEach(fieldName => {
      if (fields[fieldName] && fields[fieldName].type === 'string') {
        fields[fieldName].type = 'enum';
        fields[fieldName].options = sectionEnums[fieldName];
      }
    });
  }
  
  AdminState.schema[datasetName] = fields;
}

function renderSchemaPanel(datasetName) {
  const container = document.getElementById('schemaContainer');
  const fields = AdminState.schema[datasetName] || {};
  const html = Object.keys(fields).map(k => {
    const f = fields[k];
    const enumOptions = f.type === 'enum' && f.options ? 
      `<div class="enum-options">خيارات: ${f.options.join(', ')}</div>` : '';
    return `<div class="field-row">
      <input class="field-name" data-field="${k}" value="${k}" />
      <select class="field-type" data-field="${k}">
        ${['string','number','boolean','array','object','null','mixed','enum'].map(t=>`<option ${f.type===t?'selected':''}>${t}</option>`).join('')}
      </select>
      <label class="field-badge"><input type="checkbox" class="field-required" data-field="${k}" ${f.required?'checked':''}/> إلزامي</label>
      <label class="field-badge"><input type="checkbox" class="field-unique" data-field="${k}" ${f.unique?'checked':''}/> فريد</label>
      <button class="btn btn-outline" data-action="remove-field" data-field="${k}"><span class="material-icons">remove</span>حذف</button>
      ${enumOptions}
    </div>`;
  }).join('');
  container.innerHTML = html || '<div class="field-badge">لا توجد حقول معرّفة بعد</div>';
  // ربط أحداث محرر الحقول
  container.addEventListener('change', (e)=>{
    const t = e.target;
    const field = t.dataset.field;
    if (!field) return;
    const schema = AdminState.schema[datasetName];
    if (t.classList.contains('field-type')) {
      schema[field].type = t.value;
      // إعادة رسم اللوحة والجدول عند تغيير النوع إلى enum
      if (t.value === 'enum') {
        renderSchemaPanel(datasetName);
        renderTable(datasetName);
      }
    }
    if (t.classList.contains('field-required')) schema[field].required = t.checked;
    if (t.classList.contains('field-unique')) schema[field].unique = t.checked;
  });
  container.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action="remove-field"]');
    if (!btn) return;
    const field = btn.dataset.field;
    delete AdminState.schema[datasetName][field];
    // إزالة الحقل من كل الصفوف
    AdminState.datasets[datasetName].forEach(row => { delete row[field]; });
    renderSchemaPanel(datasetName);
    renderTable(datasetName);
  });
}

function valueToInput(field, value, datasetName) {
  const schema = AdminState.schema[datasetName];
  const fieldSchema = schema && schema[field];
  
  // التحقق من وجود enum محدد لهذا الحقل في هذا القسم
  if (fieldSchema && fieldSchema.type === 'enum' && fieldSchema.options) {
    const options = fieldSchema.options.map(option => 
      `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`
    ).join('');
    return `<select class="cell-select">${options}</select>`;
  }
  
  const t = Array.isArray(value) ? 'array' : (value===null? 'null': typeof value);
  if (t === 'boolean') {
    return `<input type="checkbox" class="cell-checkbox" ${value? 'checked':''} />`;
  } else if (t === 'number') {
    return `<input type="number" class="cell-input" value="${value ?? ''}" />`;
  } else if (t === 'string') {
    const isLong = (value||'').length > 80;
    return isLong ? `<textarea class="cell-textarea" rows="4">${value ?? ''}</textarea>` : `<input type="text" class="cell-input" value="${value ?? ''}" />`;
  } else {
    return `<textarea class="cell-textarea" rows="4">${value ? (typeof value==='string'? value : JSON.stringify(value)) : ''}</textarea>`;
  }
}

function renderTable(datasetName) {
  const rows = AdminState.datasets[datasetName] || [];
  
  // استخدام الترتيب الثابت المحدد مسبقاً للحقول
  const predefinedOrder = SECTION_FIELD_ORDER[datasetName] || [];
  
  // الحصول على جميع الحقول الفريدة من جميع الصفوف
  const allFieldsSet = new Set();
  rows.forEach(row => {
    Object.keys(row||{}).forEach(k => allFieldsSet.add(k));
  });
  
  // إنشاء ترتيب ثابت: الحقول المحددة مسبقاً أولاً، ثم أي حقول إضافية أبجدياً
  const existingPredefinedFields = predefinedOrder.filter(f => allFieldsSet.has(f));
  const additionalFields = Array.from(allFieldsSet).filter(f => !predefinedOrder.includes(f)).sort();
  const allFields = [...existingPredefinedFields, ...additionalFields];
  
  // تخزين ترتيب الحقول للاستخدام في syncRowFromInputs
  AdminState.currentFieldOrder = allFields;
  
  const thead = `<thead><tr><th>تحديد</th>${allFields.map(f=>`<th>${f}</th>`).join('')}<th>إجراءات</th></tr></thead>`;
  const tbody = `<tbody>${rows.map((row, idx)=>`<tr data-index="${idx}"><td><input type="checkbox" class="row-select" data-index="${idx}" /></td>${allFields.map(f=>`<td>${valueToInput(f, row[f], datasetName)}</td>`).join('')}<td class="row-actions"><button class="btn btn-outline" data-action="duplicate" data-index="${idx}"><span class="material-icons">content_copy</span>نسخ</button><button class="btn btn-danger" data-action="delete" data-index="${idx}"><span class="material-icons">delete</span>حذف</button></td></tr>`).join('')}</tbody>`;
  const tableHtml = `<table class="table">${thead}${tbody}</table>`;
  document.getElementById('tableContainer').innerHTML = tableHtml;
}

function attachNavHandlers() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      AdminState.currentDataset = btn.dataset.dataset;
      buildSchemaFor(AdminState.currentDataset);
      renderSchemaPanel(AdminState.currentDataset);
      renderTable(AdminState.currentDataset);
      AdminUI.showToast('تم تبديل الجدول إلى: ' + AdminState.currentDataset);
    });
  });
}

function syncRowFromInputs(tr, datasetName) {
  const idx = Number(tr.dataset.index);
  const row = AdminState.datasets[datasetName][idx];
  
  // Use the same field order as the table headers
  const fields = AdminState.currentFieldOrder || Object.keys(row||{});
  const cells = Array.from(tr.querySelectorAll('td'));
  
  // Skip the first cell (checkbox) and last cell (actions)
  const dataCells = cells.slice(1, -1);
  
  dataCells.forEach((td, i) => {
    if (i >= fields.length) return;
    const field = fields[i];
    const inp = td.querySelector('input, textarea, select');
    if (!inp) return;
    
    if (inp.type === 'checkbox') {
      row[field] = inp.checked;
    } else if (inp.type === 'number') {
      const v = inp.value.trim();
      row[field] = v === '' ? null : Number(v);
    } else if (inp.tagName === 'SELECT') {
      row[field] = inp.value;
    } else {
      const v = inp.value;
      // Try JSON parse for arrays/objects
      try {
        if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
          row[field] = JSON.parse(v);
        } else { row[field] = v; }
      } catch(e) { row[field] = v; }
    }
  });
}

function attachTableHandlers() {
  const container = document.getElementById('tableContainer');
  container.addEventListener('change', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    syncRowFromInputs(tr, AdminState.currentDataset);
  });
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const idx = Number(btn.dataset.index);
    if (action === 'delete') {
      AdminUI.showConfirm('تأكيد الحذف', 'هل تريد حذف هذا العنصر؟', ()=> {
        AdminState.datasets[AdminState.currentDataset].splice(idx,1);
        
        // Rebuild schema to ensure consistency
        buildSchemaFor(AdminState.currentDataset);
        renderSchemaPanel(AdminState.currentDataset);
        renderTable(AdminState.currentDataset);
      });
    } else if (action === 'duplicate') {
      const item = AdminState.datasets[AdminState.currentDataset][idx];
      const copy = JSON.parse(JSON.stringify(item));
      copy.id = Date.now();
      AdminState.datasets[AdminState.currentDataset].splice(idx+1,0,copy);
      
      // Rebuild schema to ensure consistency
      buildSchemaFor(AdminState.currentDataset);
      renderSchemaPanel(AdminState.currentDataset);
      renderTable(AdminState.currentDataset);
    }
  });
}

function attachToolbarHandlers() {
  document.getElementById('addRowBtn').addEventListener('click', ()=> {
    const existingRows = AdminState.datasets[AdminState.currentDataset] || [];
    const predefinedOrder = SECTION_FIELD_ORDER[AdminState.currentDataset] || [];
    
    // الحصول على جميع الحقول الفريدة من الصفوف الموجودة
    const allFields = new Set();
    existingRows.forEach(row => {
      Object.keys(row||{}).forEach(k => allFields.add(k));
    });
    
    // إضافة الحقول المحددة مسبقاً إذا لم تكن موجودة
    predefinedOrder.forEach(k => allFields.add(k));
    
    // إنشاء صف جديد مع جميع الحقول بالترتيب الصحيح
    const row = {};
    
    // إضافة الحقول بالترتيب المحدد مسبقاً أولاً
    predefinedOrder.forEach(field => {
      row[field] = null;
    });
    
    // إضافة أي حقول إضافية
    Array.from(allFields).filter(f => !predefinedOrder.includes(f)).forEach(field => {
      row[field] = null;
    });
    
    // تعيين ID افتراضي
    row.id = Date.now();
    
    AdminState.datasets[AdminState.currentDataset].push(row);
    
    // Rebuild schema to include any new fields
    buildSchemaFor(AdminState.currentDataset);
    renderSchemaPanel(AdminState.currentDataset);
    renderTable(AdminState.currentDataset);
  });
  document.getElementById('deleteSelectedBtn').addEventListener('click', ()=> {
    const selected = Array.from(document.querySelectorAll('.row-select:checked')).map(cb=>Number(cb.dataset.index));
    if (selected.length === 0) { AdminUI.showToast('لم يتم اختيار عناصر للحذف'); return; }
    AdminUI.showConfirm('حذف المحدد', `سيتم حذف ${selected.length} عنصر/عناصر، هل أنت متأكد؟`, ()=> {
      const ds = AdminState.datasets[AdminState.currentDataset];
      // حذف بالعكس لتجنب تغيير الفهارس
      selected.sort((a,b)=>b-a).forEach(idx => ds.splice(idx,1));
      
      // Rebuild schema to ensure consistency
      buildSchemaFor(AdminState.currentDataset);
      renderSchemaPanel(AdminState.currentDataset);
      renderTable(AdminState.currentDataset);
    });
  });
  document.getElementById('saveChangesBtn').addEventListener('click', ()=> {
    const report = validateDataset(AdminState.currentDataset);
    if (!report.ok) {
      AdminUI.showConfirm('تحذير التحقق', `تم العثور على ${report.errors.length} مشكلة في القيود/العلاقات. هل تريد المتابعة؟`, ()=> {
        AdminUI.showToast('تم حفظ التغييرات رغم التحذيرات', 'warning');
      });
    } else {
      AdminUI.showToast('تم حفظ التغييرات في الذاكرة', 'success');
    }
  });
  document.getElementById('refreshDataBtn').addEventListener('click', async ()=> {
    await init();
  });
  const clearBtn = document.getElementById('clearStorageBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', ()=> {
      const keys = [
        'kun-academy-marketplace',
        'kun-academy-articles',
        'kun-academy-courses',
        'kun-academy-tools',
        'kun-academy-apps',
        'kun-academy-promotions',
        'kun-academy-data-version',
        'kun-academy-pwa-ready'
      ];
      keys.forEach(k => localStorage.removeItem(k));
      AdminUI.showToast('تم مسح التخزين المؤقت بنجاح', 'success');
    });
  }
  document.getElementById('compactViewToggle').addEventListener('change', (e)=>{
    const tc = document.getElementById('tableContainer');
    tc.classList.toggle('compact', e.target.checked);
  });
  document.getElementById('editRelationsBtn').addEventListener('click', ()=>{
    const fromField = prompt('اسم الحقل (من) في الجدول الحالي؟');
    if (!fromField) return;
    const toDataset = prompt('اسم الجدول الهدف (marketplace/articles/courses/apps/tools/promotions)?');
    if (!toDataset) return;
    const toField = prompt('اسم الحقل (إلى) في الجدول الهدف؟');
    if (!toField) return;
    AdminState.relations[AdminState.currentDataset] = AdminState.relations[AdminState.currentDataset] || [];
    AdminState.relations[AdminState.currentDataset].push({fromField, toDataset, toField});
    AdminUI.showToast('تم إضافة علاقة جديدة');
  });
  document.getElementById('editConstraintsBtn').addEventListener('click', ()=>{
    const field = prompt('اسم الحقل المراد ضبط قيوده؟');
    if (!field) return;
    const schema = AdminState.schema[AdminState.currentDataset];
    if (!schema[field]) { AdminUI.showToast('الحقل غير موجود'); return; }
    const required = confirm('هل تريد جعل هذا الحقل إلزامياً؟');
    const unique = confirm('هل تريد جعل هذا الحقل فريداً؟');
    schema[field].required = required;
    schema[field].unique = unique;
    renderSchemaPanel(AdminState.currentDataset);
    AdminUI.showToast('تم تحديث القيود');
  });
  document.getElementById('exportScriptBtn').addEventListener('click', ()=> {
    const content = buildModifiedScript(AdminState.originalScript);
    const blob = new Blob([content], {type: 'text/javascript'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'script.modified.js';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById('exportExcelBtn').addEventListener('click', ()=> {
    const html = buildExcelHtml();
    const blob = new Blob([html], {type: 'application/vnd.ms-excel'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = prompt('اسم ملف الإكسل؟', 'data_export.xls') || 'data_export.xls';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById('addFieldBtn').addEventListener('click', ()=> {
    const name = prompt('اسم الحقل الجديد:');
    if (!name) return;
    const schema = AdminState.schema[AdminState.currentDataset];
    if (schema[name]) { AdminUI.showToast('الحقل موجود مسبقاً'); return; }
    schema[name] = { type: 'string', required: false, unique: false };
    // إضافة الحقل للصفوف الحالية
    AdminState.datasets[AdminState.currentDataset].forEach(row => { row[name] = null; });
    renderSchemaPanel(AdminState.currentDataset);
    renderTable(AdminState.currentDataset);
  });
}

function stringifyAsJSONLiteral(obj) {
  return JSON.stringify(obj, null, 2);
}

function replaceAssignmentLast(script, varName, newArrayJsLiteral) {
  const all = findAllAssignments(script, varName);
  if (!all || all.length === 0) return script;
  const loc = all[all.length - 1];
  const before = script.slice(0, loc.start);
  const after = script.slice(loc.end);
  const replacement = newArrayJsLiteral.trim().startsWith('[') ? newArrayJsLiteral : '[' + newArrayJsLiteral + ']';
  return before + replacement + after;
}

function buildModifiedScript(original) {
  let s = original;
  s = replaceAssignmentLast(s, 'marketplaceData', stringifyAsJSONLiteral(AdminState.datasets.marketplace));
  s = replaceAssignmentLast(s, 'articlesData', stringifyAsJSONLiteral(AdminState.datasets.articles));
  s = replaceAssignmentLast(s, 'coursesData', stringifyAsJSONLiteral(AdminState.datasets.courses));
  s = replaceAssignmentLast(s, 'toolsData', stringifyAsJSONLiteral(AdminState.datasets.tools));
  s = replaceAssignmentLast(s, 'appsData', stringifyAsJSONLiteral(AdminState.datasets.apps));
  s = replaceAssignmentLast(s, 'promotionsData', stringifyAsJSONLiteral(AdminState.datasets.promotions));
  return s;
}

function buildExcelHtml() {
  const datasets = AdminState.datasets;
  const tables = Object.keys(datasets).map(name => {
    const rows = datasets[name];
    const cols = Array.from(rows.reduce((set,row)=>{Object.keys(row||{}).forEach(k=>set.add(k)); return set;}, new Set()));
    const thead = `<thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map(row=>`<tr>${cols.map(c=>`<td>${valueToExcelCell(row[c])}</td>`).join('')}</tr>`).join('')}</tbody>`;
    return `<h3>${name}</h3><table border="1">${thead}${tbody}</table>`;
  }).join('<hr/>');
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${tables}</body></html>`;
}

function valueToExcelCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function normalizeApps(rows) {
  return (rows || []).map(app => ({
    ...app,
    features: toArrayNormalized(app?.features),
    detailedFeatures: toArrayNormalized(app?.detailedFeatures),
    useCases: toArrayNormalized(app?.useCases),
  }));
}

function normalizeTools(rows) {
  return (rows || []).map(tool => ({
    ...tool,
    features: toArrayNormalized(tool?.features),
    detailedFeatures: toArrayNormalized(tool?.detailedFeatures),
    useCases: toArrayNormalized(tool?.useCases),
  }));
}

function toArrayNormalized(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    const parts = s.indexOf('\n') >= 0 ? s.split(/\r?\n/) : s.split(',');
    return parts.map(x => x.trim()).filter(Boolean);
  }
  if (v && typeof v === 'object') return Object.values(v).map(x => String(x)).filter(Boolean);
  return [];
}

function validateDataset(datasetName) {
  const errors = [];
  const rows = AdminState.datasets[datasetName] || [];
  const schema = AdminState.schema[datasetName] || {};
  const constraints = AdminState.constraints[datasetName] || {};
  const relations = AdminState.relations[datasetName] || [];
  // required and type
  Object.keys(schema).forEach(field => {
    const cfg = schema[field];
    if (cfg.required) {
      rows.forEach((row, i) => {
        const v = row[field];
        if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
          errors.push(`الحقل '${field}' إلزامي (صف ${i})`);
        }
      });
    }
    if (cfg.unique) {
      const seen = new Set();
      rows.forEach((row, i) => {
        const v = row[field];
        const key = JSON.stringify(v);
        if (seen.has(key)) errors.push(`الحقل '${field}' يجب أن يكون فريداً (صف ${i})`);
        seen.add(key);
      });
    }
  });
  // relations
  relations.forEach(rel => {
    const target = AdminState.datasets[rel.toDataset] || [];
    const targetIndex = new Set(target.map(t => JSON.stringify(t[rel.toField])));
    rows.forEach((row, i) => {
      const v = JSON.stringify(row[rel.fromField]);
      if (!targetIndex.has(v)) errors.push(`العلاقة غير متحققة: ${datasetName}.${rel.fromField} -> ${rel.toDataset}.${rel.toField} (صف ${i})`);
    });
  });
  return { ok: errors.length === 0, errors };
}

async function init() {
  try {
    await readScriptFile();
    extractDatasets();
    
    // Build schema for all datasets
    try {
      Object.keys(AdminState.datasets).forEach(name => buildSchemaFor(name));
    } catch (schemaError) {
      console.warn('Schema building error:', schemaError);
    }
    
    // Update stats safely
    try {
      updateDataStats();
    } catch (statsError) {
      console.warn('Stats update error:', statsError);
      // Fallback to simple status update
      const loadStatusEl = document.getElementById('loadStatus');
      if (loadStatusEl) {
        const ds = AdminState.datasets;
        loadStatusEl.textContent = `بيانات محمّلة — سوق: ${ds.marketplace?.length || 0} | مقالات: ${ds.articles?.length || 0} | كورسات: ${ds.courses?.length || 0} | أدوات: ${ds.tools?.length || 0} | تطبيقات: ${ds.apps?.length || 0} | عروض: ${ds.promotions?.length || 0}`;
      }
    }
    
    // Default dataset render
    try {
      renderSchemaPanel(AdminState.currentDataset);
      renderTable(AdminState.currentDataset);
    } catch (renderError) {
      console.warn('Render error:', renderError);
      AdminUI.showToast('تم تحميل البيانات مع بعض المشاكل في العرض', 'warning');
    }
    
  } catch (e) {
    console.error('Init error:', e);
    AdminUI.showToast('تعذر تحميل البيانات', 'error');
    const loadStatusEl = document.getElementById('loadStatus');
    if (loadStatusEl) {
      loadStatusEl.textContent = 'فشل التحميل';
    }
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('scriptFileName').textContent = SCRIPT_FILE;
  attachNavHandlers();
  attachToolbarHandlers();
  attachTableHandlers();

  await init();
});