// How UHY's client codes line up between CSA and its workbooks. CSA writes a code with one or two
// letters after the number (A0873K, B3066UK); the DN workbook and the AGM workbook leave them off
// (A0873, B3066). What the letters stand for is not confirmed.
export function workbookCode(csaCode: string): string {
  const m = /^([A-Z]\d{3,4})[A-Z]{1,2}$/.exec(csaCode.trim().toUpperCase());
  return m ? m[1] : csaCode.trim().toUpperCase();
}
