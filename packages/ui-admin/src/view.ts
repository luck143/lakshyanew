// packages/ui-admin/src/view.ts
// Pure view-model builder: turns admin metadata (from GET /api/meta/:resource)
// into the concrete shapes the UI renders. This is the "dynamic admin
// generation" brain — no per-resource code needed.

export interface ColumnView {
  key: string;
  label: string;
}
export interface FormFieldView {
  key: string;
  label: string;
  type: string;       // widget type: text | textarea | select | relation | tags | richtext ...
  required: boolean;
  options?: Record<string, string>;
  placeholder?: string;
  help?: string;
}
export interface FilterFieldView {
  key: string;
  label: string;
  type: string;
  options?: Record<string, string>;
}

// Input: the `data` of GET /api/meta/:resource (adminMeta payload shape)
export interface AdminMetaPayload {
  name: string;
  label: string;
  labelPlural?: string;
  fields: Record<string, any>; // per-op FieldMeta maps
  listView: { columns: Record<string, string>; sortables: Record<string, string>; filters: Record<string, string>; pageSize?: number; defaultSort?: string };
  filters: string[];
  webView?: any;
}

export interface ResourceView {
  resource: string;
  label: string;
  columns: ColumnView[];
  formFields: FormFieldView[];
  filterFields: FilterFieldView[];
}

function widgetFor(field: any): string {
  switch (field.type) {
    case 'richtext': return 'richtext';
    case 'text': return 'textarea';
    case 'enum': return 'select';
    case 'relation': return 'relation';
    case 'tags': return 'tags';
    case 'bool': return 'checkbox';
    case 'int':
    case 'float': return 'number';
    case 'date': return 'date';
    case 'datetime': return 'datetime';
    default: return 'text';
  }
}

export function buildView(meta: AdminMetaPayload): ResourceView {
  const listFields = meta.fields['list'] ?? meta.fields['get'] ?? {};
  const createFields = meta.fields['create'] ?? {};
  const updateFields = meta.fields['update'] ?? {};

  // Table columns come from listView.columns (the metadata-declared columns)
  const columns: ColumnView[] = Object.entries(meta.listView.columns).map(([key, label]) => ({
    key,
    label,
  }));

  // Form fields = union of create + update editable fields
  const formKeys = new Set<string>([
    ...Object.keys(createFields),
    ...Object.keys(updateFields),
  ]);
  const formFields: FormFieldView[] = [];
  for (const key of formKeys) {
    const f = createFields[key] ?? updateFields[key];
    if (!f) continue;
    formFields.push({
      key,
      label: f.label,
      type: widgetFor(f),
      required: !!f.required,
      options: f.options && !Array.isArray(f.options) ? f.options : undefined,
      placeholder: f.ui?.placeholder,
      help: f.ui?.help,
    });
  }

  // Filter fields from declared filters
  const filterFields: FilterFieldView[] = (meta.filters ?? []).map((key) => {
    const f = listFields[key] ?? createFields[key];
    return {
      key,
      label: f?.label ?? key,
      type: f ? widgetFor(f) : 'text',
      options: f?.options && !Array.isArray(f.options) ? f.options : undefined,
    };
  });

  return { resource: meta.name, label: meta.label, columns, formFields, filterFields };
}
