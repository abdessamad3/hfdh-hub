export const TEST_PROJECT = 'katatib-64049';
export function validateConfig(config) {
  if (config?.projectId !== TEST_PROJECT || config.authDomain !== `${TEST_PROJECT}.firebaseapp.com` || typeof config.apiKey !== 'string' || !config.apiKey || typeof config.appId !== 'string') throw new Error('wrong-project');
  return config;
}
export function accessScopes(access) {
  if (access?.active !== true || !['admin','manager','teacher','parent','student'].includes(access.role)) throw new Error('no-access');
  if (access.role === 'admin') return [{ field: null, value: null }];
  if(['parent','student'].includes(access.role)){
    if(!Array.isArray(access.studentIds)||!access.studentIds.length||access.studentIds.length>10||access.studentIds.some(id=>typeof id!=='string'||!id||/[~/]/.test(id)))throw new Error('no-access');
    return [...new Set(access.studentIds)].map(value=>({field:'__name__',value}));
  }
  const fields = [['kuttabNames', 'kuttabName'], ['teacherIds', 'teacherId']];
  const scopes = fields.flatMap(([key, field]) => {
    const values = access[key] ?? [];
    if (!Array.isArray(values) || values.length > 10 || values.some(v => typeof v !== 'string' || !v.trim())) throw new Error('no-access');
    return [...new Set(values)].map(value => ({ field, value }));
  });
  if (!scopes.length) throw new Error('no-access');
  return scopes;
}
export function studentView(id, data) {
  const text = value => typeof value === 'string' ? value : '';
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  return { id, name: text(data.name), kuttab: text(data.kuttabName), age: number(data.age), hizbs: number(data.stats?.totalHizbs ?? data.totalHizbs), attendance: number(data.stats?.attendanceRate ?? data.attendanceRate) };
}
export function mergeStudents(batches) {
  return [...new Map(batches.flat().map(s => [s.id, s])).values()].sort((a, b) => a.name.localeCompare(b.name));
}
